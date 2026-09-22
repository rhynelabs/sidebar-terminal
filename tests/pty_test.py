import base64
import json
import os
from pathlib import Path
import queue
import re
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Bridge:
    def __init__(self, cwd, command="", shell=None, env=None):
        windows = sys.platform == "win32"
        host = "windows_host.py" if windows else "pty_host.py"
        shell = shell or ("powershell.exe" if windows else "/bin/bash")
        self.process = subprocess.Popen(
            [sys.executable, "-u", str(ROOT / "bridge" / host), json.dumps({
                "cols": 80, "rows": 24, "cwd": cwd, "shell": shell, "command": command,
            })], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env={**os.environ, **(env or {})},
        )
        self.messages = queue.Queue()
        self.output = ""
        threading.Thread(target=self.read, daemon=True).start()
        try:
            self.ready = self.until(lambda message: message["type"] == "ready")
            if windows and not command:
                self.expect(">")
        except Exception:
            self.close()
            raise

    def read(self):
        for line in self.process.stdout:
            try:
                self.messages.put(json.loads(line))
            except ValueError:
                self.messages.put({"type": "error", "message": line.decode()})

    def until(self, predicate, timeout=30):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                message = self.messages.get(timeout=0.2)
            except queue.Empty:
                if self.process.poll() is not None:
                    raise AssertionError("Bridge exited: " + self.process.stderr.read().decode())
                continue
            if message["type"] == "error":
                raise AssertionError(message["message"])
            if message["type"] == "data":
                self.output += base64.b64decode(message["data"]).decode("utf-8", errors="replace")
            if predicate(message):
                return message
        raise AssertionError("Timed out. Output: " + self.output[-2000:])

    def send(self, message):
        self.process.stdin.write((json.dumps(message) + "\n").encode())
        self.process.stdin.flush()

    def write(self, text):
        self.send({"type": "input", "data": base64.b64encode(text.encode()).decode()})

    def expect(self, text):
        self.until(lambda _message: text in self.output)

    def close(self):
        if self.process.poll() is None:
            self.process.stdin.close()
            self.process.wait(timeout=6)
        self.process.stdout.close()
        self.process.stderr.close()


class PtyTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="terminal space ü ")
        self.bridge = Bridge(self.directory.name)

    def tearDown(self):
        self.bridge.close()
        # Windows may release console-host directory handles just after process exit.
        deadline = time.monotonic() + 2
        while True:
            try:
                self.directory.cleanup()
                break
            except PermissionError:
                if sys.platform != "win32" or time.monotonic() >= deadline:
                    raise
                time.sleep(0.02)

    def test_interactive_unicode_and_directory(self):
        if sys.platform == "win32":
            self.bridge.write("Write-Output ('HELLO_' + 'TERMINAL_ä'); (Get-Location).Path\r")
        else:
            self.bridge.write("printf 'HELLO_%s\\n' 'TERMINAL_ä'; pwd\r")
        self.bridge.until(lambda _: "HELLO_TERMINAL_ä" in self.bridge.output
                          and os.path.normcase(os.path.realpath(self.directory.name))
                          in os.path.normcase(self.bridge.output))

    @unittest.skipIf(sys.platform == "win32", "Unix terminal size query")
    def test_resize(self):
        self.bridge.send({"type": "resize", "cols": 97, "rows": 31})
        self.bridge.write("stty size\r")
        self.bridge.expect("31 97")

    @unittest.skipIf(sys.platform == "win32", "Unix signals")
    def test_ctrl_c_interrupts_foreground_not_shell(self):
        self.bridge.write("sh -c \"printf 'JOB_%s\\n' READY; exec sleep 90\"\r")
        self.bridge.expect("JOB_READY")
        offset = len(self.bridge.output)
        self.bridge.write("\x03")
        self.bridge.until(lambda _: re.search(r"[$#] ", self.bridge.output[offset:]) is not None)
        self.bridge.write("printf 'STILL_%s\\n' ALIVE\r")
        self.bridge.expect("STILL_ALIVE")

    @unittest.skipIf(sys.platform == "win32", "Unix process ownership")
    def test_eof_closes_shell_and_child_job(self):
        self.bridge.write("sleep 90 & echo JOBPID=$!\r")
        import re
        self.bridge.until(lambda _: re.search(r"JOBPID=(\d+)", self.bridge.output) is not None)
        child = int(re.search(r"JOBPID=(\d+)", self.bridge.output).group(1))
        shell = self.bridge.ready["pid"]
        self.bridge.close()
        for pid in (shell, child):
            result = subprocess.run(["/bin/ps", "-o", "stat=", "-p", str(pid)], capture_output=True, text=True)
            self.assertTrue(not result.stdout.strip() or result.stdout.strip().startswith("Z"), result.stdout)

    def test_profile_starts_once_after_shell_initialization(self):
        self.bridge.close()
        command = "Write-Output ('PROFILE_' + 'STARTED')" if sys.platform == "win32" else "printf 'PROFILE_%s\\n' STARTED"
        self.bridge = Bridge(self.directory.name, command)
        self.bridge.expect("PROFILE_STARTED")
        self.assertEqual(self.bridge.output.count("PROFILE_STARTED"), 1)
        time.sleep(0.2)
        self.bridge.write("echo NORMAL_SHELL\r")
        self.bridge.expect("NORMAL_SHELL")
        self.assertIsNone(self.bridge.process.poll())

    @unittest.skipIf(sys.platform == "win32", "Unix foreground interrupt")
    def test_profile_interrupt_returns_to_interactive_shell(self):
        self.bridge.close()
        self.bridge = Bridge(self.directory.name, "printf 'PROFILE_%s\\n' READY; sleep 90")
        self.bridge.expect("PROFILE_READY")
        time.sleep(0.2)
        self.bridge.write("\x03")
        time.sleep(0.3)
        self.bridge.write("printf 'AFTER_%s\\n' INTERRUPT\r")
        self.bridge.expect("AFTER_INTERRUPT")
        self.assertIsNone(self.bridge.process.poll())

    def test_exit_status(self):
        for attempt in range(5 if sys.platform == "win32" else 1):
            with self.subTest(attempt=attempt):
                if attempt:
                    self.bridge.close()
                    self.bridge = Bridge(self.directory.name)
                self.bridge.write("exit 7\r")
                event = self.bridge.until(lambda message: message["type"] == "exit")
                self.assertEqual(event["code"], 7)


if __name__ == "__main__":
    unittest.main()
