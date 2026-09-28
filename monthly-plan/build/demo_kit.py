"""Helpers for generating a free demo from a paid single-file HTML app.

Import this from a per-product make_demo.py. The demo is always *generated*
from the paid file, never edited by hand, so a fix to the product reaches the
demo by re-running the build.

Every edit asserts that its anchor text occurs exactly the expected number of
times. When the app changes shape, the build stops with the anchor that moved,
instead of quietly shipping a demo whose cap or locks never got applied.
"""
import io, re


class Patcher:
    def __init__(self, src_path):
        self.src_path = src_path
        self.s = io.open(src_path, encoding='utf-8').read()
        self.applied = 0

    def rep(self, old, new, count=1):
        """Replace `old` with `new`; `old` must occur exactly `count` times."""
        hits = self.s.count(old)
        assert hits == count, f'anchor found {hits}x, expected {count}: {old[:100]!r}'
        self.s = self.s.replace(old, new)
        self.applied += 1

    def before(self, anchor, text, count=1):
        self.rep(anchor, text + anchor, count)

    def after(self, anchor, text, count=1):
        self.rep(anchor, anchor + text, count)

    def title(self, new_title):
        """Swap the <title>, whatever it currently says."""
        m = re.search(r'<title>[^<]*</title>', self.s)
        assert m, 'no <title> found'
        self.s = self.s[:m.start()] + f'<title>{new_title}</title>' + self.s[m.end():]
        self.applied += 1

    def namespace_storage(self, prefix, suffix='-demo', minimum=1):
        """Give the demo its own localStorage/IndexedDB keys.

        `prefix` is the string every storage key starts with (e.g.
        'jps-monthly-plan'). Without this, a visitor who later buys the
        product and opens both in the same browser has the demo and the paid
        app reading and overwriting each other's data.
        """
        hits = self.s.count(prefix)
        assert hits >= minimum, f'storage prefix {prefix!r} found {hits}x, expected >= {minimum}'
        self.s = self.s.replace(prefix, prefix + suffix)
        self.applied += 1
        return hits

    def forbid(self, *needles):
        """Assert strings that must not survive into the demo (placeholders etc)."""
        for n in needles:
            assert n not in self.s, f'must not ship: {n!r}'

    def save(self, out_path):
        io.open(out_path, 'w', encoding='utf-8').write(self.s)
        return len(self.s)


def engine_unchanged(full_path, demo_path, start_marker, end_marker, allowed=()):
    """Return the lines that differ in the app's core logic between full and demo.

    Pass markers that bracket the engine (e.g. 'const Budget = (() => {' and
    the first line after the modules). `allowed` lists substrings a differing
    line may contain and still be expected, such as the namespaced storage key.
    An empty result means the demo runs the same calculations as the product.
    """
    import difflib
    def seg(p):
        s = io.open(p, encoding='utf-8').read()
        return s[s.index(start_marker):s.index(end_marker)].splitlines()
    diff = [l for l in difflib.unified_diff(seg(full_path), seg(demo_path), lineterm='', n=0)
            if l[:1] in '+-' and l[:3] not in ('+++', '---')]
    return [l for l in diff if not any(a in l for a in allowed)]
