"""Terminate owned terminal jobs, including foreground process groups."""
import os
import signal
import sys
from pathlib import Path
import time


def descendants(parent):
    owned = set()
    pending = [parent]
    while pending:
        current = pending.pop()
        for child in direct_children(current):
            if child not in owned:
                owned.add(child)
                pending.append(child)
    return owned


def direct_children(parent):
    if sys.platform == "darwin":
        import ctypes
        library = ctypes.CDLL("/usr/lib/libproc.dylib")
        function = library.proc_listchildpids
        function.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_int]
        function.restype = ctypes.c_int
        count = function(parent, None, 0) + 1024
        buffer = (ctypes.c_int * count)()
        used = function(parent, buffer, ctypes.sizeof(buffer))
        return {pid for pid in buffer[:max(0, used)] if pid > 0}
    children = set()
    try:
        for task in Path(f"/proc/{parent}/task").iterdir():
            try:
                children.update(map(int, (task / "children").read_text().split()))
            except (OSError, ValueError):
                pass
    except OSError:
        pass
    return children


def terminate(child, master):
    owned = descendants(child) | {child}
    groups = set()
    for pid in owned:
        try:
            group = os.getpgid(pid)
            if group != os.getpgrp():
                groups.add(group)
        except ProcessLookupError:
            pass
    # Closing the PTY releases jobs blocked in tty writes before waiting for them.
    os.close(master)
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for group in groups:
            try:
                os.killpg(group, sig)
            except ProcessLookupError:
                pass
        for pid in owned:
            try:
                os.kill(pid, sig)
            except ProcessLookupError:
                pass
        if sig == signal.SIGTERM:
            time.sleep(0.15)
    deadline = time.monotonic() + 1
    while time.monotonic() < deadline:
        try:
            if os.waitpid(child, os.WNOHANG)[0]:
                return
        except ChildProcessError:
            return
        time.sleep(0.01)
