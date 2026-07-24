import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import manage


class PiResourceManagerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        root = Path(self.temporary.name)
        self.source = root / "source"
        self.home = root / "home"
        self.home.mkdir()

        (self.source / "agents").mkdir(parents=True)
        (self.source / "skills/example").mkdir(parents=True)
        (self.source / "extensions/example").mkdir(parents=True)
        (self.source / "AGENTS.md").write_text("global instructions\n")
        (self.source / "agents/reviewer.md").write_text("reviewer\n")
        (self.source / "skills/example/SKILL.md").write_text("skill\n")
        (self.source / "extensions/example/index.ts").write_text("export default {}\n")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def apply(self) -> None:
        manage.validate_source(self.source)
        with patch.object(manage, "install_dependencies"):
            manage.apply(self.home, self.source)

    def test_syncs_regular_files_preserves_unmanaged_and_repairs_drift(self) -> None:
        skills = self.home / ".agents/skills"
        skills.mkdir(parents=True)
        (skills / "browser").mkdir()
        (skills / "browser/marker").write_text("preserve\n")
        (skills / "stale").symlink_to("/tmp/projects/dotfiles/agents/skills/stale")

        self.apply()

        self.assertTrue((self.home / ".pi/agent/AGENTS.md").is_file())
        self.assertFalse((self.home / ".pi/agent/AGENTS.md").is_symlink())
        self.assertEqual((skills / "browser/marker").read_text(), "preserve\n")
        self.assertFalse((skills / "stale").exists())
        self.assertTrue(manage.is_clean(self.home, self.source))

        runtime_skill = skills / "example/SKILL.md"
        runtime_skill.write_text("drift\n")
        self.assertFalse(manage.is_clean(self.home, self.source))
        self.apply()
        self.assertEqual(runtime_skill.read_text(), "skill\n")

    def test_corrupt_state_cannot_escape_owned_roots(self) -> None:
        self.apply()
        victim = self.home / "victim"
        victim.mkdir()
        (victim / "marker").write_text("safe\n")

        state_path = self.home / manage.STATE_RELATIVE_PATH
        state = json.loads(state_path.read_text())
        state["owned"]["skills"].append("../../victim")
        state_path.write_text(json.dumps(state))
        self.apply()

        self.assertEqual((victim / "marker").read_text(), "safe\n")

    def test_refuses_symlinked_runtime_parent(self) -> None:
        outside = Path(self.temporary.name) / "outside"
        outside.mkdir()
        (self.home / ".agents").symlink_to(outside)

        with self.assertRaises(RuntimeError):
            self.apply()

    def test_rejects_canonical_symlinks(self) -> None:
        outside = Path(self.temporary.name) / "outside-skill"
        outside.mkdir()
        (self.source / "skills/bad").symlink_to(outside)

        with self.assertRaises(RuntimeError):
            manage.validate_source(self.source)


if __name__ == "__main__":
    unittest.main()
