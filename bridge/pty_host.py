"""Private stdio JSON-lines transport for one Unix PTY. No network listener."""
import base64
import errno
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios

from processes import terminate

MAX_BUFFER = 4 * 1024 * 1024


def emit(kind, **payload):
    sys.stdout.write(json.dumps({"type": kind, **payload}) + "\n")
    sys.stdout.flush()


def resize(fd, cols, rows):
    cols = max(2, min(1000, int(cols)))
    rows = max(1, min(1000, int(rows)))
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))


def run(config):
    # Set initial dimensions before fork so interactive programs see them at startup.
    master, slave = pty.openpty()
    resize(slave, config["cols"], config["rows"])
    child = os.fork()
    if child == 0:
        try:
            os.close(master)
            os.setsid()
            fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
            for target in (0, 1, 2):
                os.dup2(slave, target)
            if slave > 2:
                os.close(slave)
            os.chdir(config["cwd"])
            environment = dict(os.environ, TERM="xterm-256color", COLORTERM="truecolor")
            environment["SHELL"] = config["shell"]
            environment["TERM_PROGRAM"] = "ObsidianTerminal"
            args = [config["shell"], "-l", "-i"]
            os.execvpe(config["shell"], args, environment)
        except Exception as error:
            os.write(2, ("Terminal could not start: " + str(error) + "\r\n").encode())
            os._exit(127)
    os.close(slave)
    os.set_blocking(master, False)
    incoming = bytearray()
    pending = bytearray()
    stopping = False
    profile = config.get("command", "").strip()

    def launch_profile_when_ready():
        nonlocal profile
        if not profile:
            return
        # Zsh/Bash/Fish turn off canonical input when their configured line editor
        # is ready. Never type into startup scripts or create a replacement shell.
        flags = termios.tcgetattr(master)[3]
        if not flags & (termios.ICANON | termios.ECHO) and os.tcgetpgrp(master) == child:
            pending.extend((profile + "\r").encode("utf-8"))
            profile = ""

    def stop(_signum, _frame):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGHUP, stop)
    signal.signal(signal.SIGINT, stop)
    emit("ready", pid=child)
    try:
        while not stopping:
            launch_profile_when_ready()
            readable, writable, _ = select.select([0, master], [master] if pending else [], [], 0.1)
            if master in readable:
                try:
                    chunk = os.read(master, 32768)
                except OSError as error:
                    if error.errno == errno.EIO:
                        break
                    raise
                if not chunk:
                    break
                emit("data", data=base64.b64encode(chunk).decode("ascii"))
            if 0 in readable:
                chunk = os.read(0, 65536)
                if not chunk:
                    stopping = True
                    break
                incoming.extend(chunk)
                if len(incoming) > MAX_BUFFER:
                    raise ValueError("Input exceeds the terminal buffer limit")
                while b"\n" in incoming:
                    line, _, rest = incoming.partition(b"\n")
                    incoming = bytearray(rest)
                    message = json.loads(line)
                    if message["type"] == "input":
                        pending.extend(base64.b64decode(message["data"], validate=True))
                        if len(pending) > MAX_BUFFER:
                            raise ValueError("Terminal input queue is full")
                    elif message["type"] == "resize":
                        resize(master, message["cols"], message["rows"])
                    elif message["type"] == "close":
                        stopping = True
            if master in writable:
                try:
                    count = os.write(master, pending)
                    del pending[:count]
                except BlockingIOError:
                    pass
            exited, status = os.waitpid(child, os.WNOHANG)
            if exited:
                # Drain final output before reporting the exit.
                while True:
                    try:
                        chunk = os.read(master, 32768)
                        if not chunk:
                            break
                        emit("data", data=base64.b64encode(chunk).decode("ascii"))
                    except OSError:
                        break
                emit("exit", code=os.waitstatus_to_exitcode(status))
                return
        if not stopping:
            _, status = os.waitpid(child, 0)
            emit("exit", code=os.waitstatus_to_exitcode(status))
    finally:
        terminate(child, master)


if __name__ == "__main__":
    try:
        run(json.loads(sys.argv[1]))
    except Exception as error:
        try:
            emit("error", message=str(error))
        except BrokenPipeError:
            pass
        sys.exit(1)
