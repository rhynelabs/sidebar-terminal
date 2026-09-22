"""ConPTY adapter with the same JSON-lines protocol as the Unix adapter."""
import base64
import codecs
import json
import os
import queue
import subprocess
import sys
import threading


def emit(kind, **payload):
    sys.stdout.write(json.dumps({"type": kind, **payload}) + "\n")
    sys.stdout.flush()


def run(config):
    try:
        from winpty import PtyProcess
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
    child = PtyProcess.spawn(
        args, cwd=config["cwd"], dimensions=(config["rows"], config["cols"]),
        env=dict(os.environ, TERM="xterm-256color", COLORTERM="truecolor", SHELL=shell), backend=1,
    )
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

    def read_output():
        try:
            while True:
                output = child.read(32768)
                messages.put({"type": "output", "data": output})
        except EOFError:
            messages.put({"type": "exit"})
        except Exception as error:
            messages.put({"type": "error", "message": str(error)})

    threading.Thread(target=read_input, daemon=True).start()
    threading.Thread(target=read_output, daemon=True).start()
    decoder = codecs.getincrementaldecoder("utf-8")()
    emit("ready", pid=child.pid)
    try:
        while True:
            try:
                message = messages.get(timeout=0.2)
            except queue.Empty:
                if not child.isalive():
                    emit("exit", code=child.exitstatus)
                    break
                continue
            kind = message["type"]
            if kind == "input":
                text = decoder.decode(base64.b64decode(message["data"], validate=True))
                if text:
                    child.write(text)
            elif kind == "output":
                emit("data", data=base64.b64encode(message["data"].encode("utf-8")).decode("ascii"))
            elif kind == "resize":
                child.setwinsize(max(1, min(1000, int(message["rows"]))),
                                 max(2, min(1000, int(message["cols"]))))
            elif kind in ("close", "exit"):
                if kind == "exit":
                    emit("exit", code=child.exitstatus)
                break
            elif kind == "error":
                raise RuntimeError(message["message"])
    finally:
        if child.isalive():
            subprocess.run(["taskkill.exe", "/PID", str(child.pid), "/T", "/F"],
                           capture_output=True, timeout=3, check=False)
        child.close(force=True)


if __name__ == "__main__":
    try:
        run(json.loads(sys.argv[1]))
    except Exception as error:
        emit("error", message=str(error))
        sys.exit(1)
