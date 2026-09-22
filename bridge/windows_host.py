"""ConPTY adapter with the same JSON-lines protocol as the Unix adapter."""
import base64
import codecs
import json
import os
import queue
import shutil
import subprocess
import sys
import threading


def emit(kind, **payload):
    sys.stdout.write(json.dumps({"type": kind, **payload}) + "\n")
    sys.stdout.flush()


def run(config):
    try:
        from winpty import PTY
    except ImportError as error:
        raise RuntimeError(
            'Windows requires pywinpty. Install it for this Python: '
            '"' + sys.executable + '" -m pip install "pywinpty>=3.0,<4"'
        ) from error
    shell = config["shell"]
    name = os.path.basename(shell).lower()
    args = [shell]
    command = config.get("command", "").strip()
    if name in ("powershell.exe", "pwsh.exe"):
        args += ["-NoLogo"]
        if command:
            args += ["-NoExit", "-Command", command]
    elif name in ("bash.exe", "zsh.exe"):
        args += ["-l", "-i"]
        if command:
            args += ["-c", command + '\nexec "$SHELL" -l -i']
    elif name in ("cmd", "cmd.exe") and command:
        args += ["/d", "/s", "/k", command]
    elif command:
        raise ValueError("Command profiles require PowerShell, cmd, bash or zsh")
    executable = shutil.which(shell)
    if not executable:
        raise FileNotFoundError(f"Shell executable not found: {shell}")
    environment = dict(os.environ, TERM="xterm-256color", COLORTERM="truecolor", SHELL=shell)
    child = PTY(config["cols"], config["rows"], backend=1)
    child.spawn(executable, cmdline=" " + subprocess.list2cmdline(args[1:]),
                cwd=config["cwd"], env="\0".join(f"{k}={v}" for k, v in environment.items()) + "\0")
    messages = queue.Queue(maxsize=64)

    def read_input():
        try:
            while True:
                line = sys.stdin.buffer.readline(4 * 1024 * 1024 + 1)
                if not line:
                    break
                if len(line) > 4 * 1024 * 1024:
                    raise ValueError("Input exceeds buffer limit")
                messages.put(json.loads(line))
        except Exception as error:
            messages.put({"type": "error", "message": str(error)})
        finally:
            messages.put({"type": "close"})

    threading.Thread(target=read_input, daemon=True).start()
    decoder = codecs.getincrementaldecoder("utf-8")()
    emit("ready", pid=child.pid)
    try:
        while True:
            # Poll the native PTY directly. Blocking reader wrappers can stall
            # PowerShell startup and add a loopback socket transport we do not need.
            output = child.read(blocking=False)
            if output:
                emit("data", data=base64.b64encode(output.encode("utf-8")).decode("ascii"))
            if not child.isalive():
                emit("exit", code=child.get_exitstatus())
                break
            try:
                message = messages.get(timeout=0.01)
            except queue.Empty:
                continue
            kind = message["type"]
            if kind == "input":
                text = decoder.decode(base64.b64decode(message["data"], validate=True))
                if text:
                    child.write(text)
            elif kind == "resize":
                child.set_size(max(2, min(1000, int(message["cols"]))),
                               max(1, min(1000, int(message["rows"]))))
            elif kind == "close":
                break
            elif kind == "error":
                raise RuntimeError(message["message"])
    finally:
        if child.isalive():
            subprocess.run(["taskkill.exe", "/PID", str(child.pid), "/T", "/F"],
                           capture_output=True, timeout=3, check=False)
        child.cancel_io()


if __name__ == "__main__":
    try:
        run(json.loads(sys.argv[1]))
    except Exception as error:
        emit("error", message=str(error))
        sys.exit(1)
