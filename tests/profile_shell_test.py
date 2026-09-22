"""A profile must return to the original configured shell, even after repeated Ctrl+C."""
from pathlib import Path
import tempfile
import time
import unittest

from pty_test import Bridge


@unittest.skipUnless(Path('/bin/zsh').exists(), 'Requires Zsh')
class ProfileShellTests(unittest.TestCase):
    def test_profile_and_plain_shell_have_identical_initialized_prompt(self):
        with tempfile.TemporaryDirectory() as home:
            directory = Path(home)
            (directory / '.zshrc').write_text(
                'sleep 0.15\n'
                'print boot >> "$ZDOTDIR/boot-count"\n'
                'PROMPT="CONFIGURED_PROMPT> "\n'
            )
            for command in ('', "printf 'PROFILE_%s\\n' READY; sleep 90"):
                bridge = Bridge(home, command, shell='/bin/zsh', env={'ZDOTDIR': home})
                try:
                    if command:
                        bridge.expect('PROFILE_READY')
                        time.sleep(0.1)
                        bridge.output = ''
                        bridge.write('\x03')
                        time.sleep(0.03)
                        bridge.write('\x03')
                    bridge.expect('CONFIGURED_PROMPT> ')
                    bridge.write("printf 'SHELL_%s\\n' USABLE\r")
                    bridge.expect('SHELL_USABLE')
                    self.assertIsNone(bridge.process.poll())
                finally:
                    bridge.close()
            # Once for the plain shell, once for the profile shell. No replacement shell.
            self.assertEqual((directory / 'boot-count').read_text().splitlines(), ['boot', 'boot'])
