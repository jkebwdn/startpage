import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('updater', Path(__file__).resolve().parents[1] / 'scripts/update_pinterest.py')
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


def rss(items):
    return ('<rss><channel>' + items + '</channel></rss>').encode()


def item(number=1, description=None):
    description = description or '<img src="https://i.pinimg.com/236x/a.jpg">'
    return f'<item><title><![CDATA[Art & <test>]]></title><link>https://uk.pinterest.com/pin/{number}/</link><description><![CDATA[{description}]]></description></item>'


class FeedTests(unittest.TestCase):
    def test_valid_cdata_and_image_upgrade(self):
        pin = updater.parse_feed(rss(item()))[0]
        self.assertEqual(pin['title'], 'Art & <test>')
        self.assertEqual(pin['image'], 'https://i.pinimg.com/736x/a.jpg')
        self.assertEqual(pin['thumbnail'], 'https://i.pinimg.com/236x/a.jpg')

    def test_escaped_description_and_entities(self):
        body = rss('<item><link>https://www.pinterest.com/pin/2/</link><description>&lt;img src="https://i.pinimg.com/a.jpg?a=1&amp;amp;b=2"&gt;</description></item>')
        self.assertEqual(updater.parse_feed(body)[0]['image'], 'https://i.pinimg.com/a.jpg?a=1&b=2')

    def test_limits_and_duplicates(self):
        pins = updater.parse_feed(rss(item() + ''.join(item(i) for i in range(1, 60))))
        self.assertEqual(len(pins), 40)
        self.assertEqual(len({p['link'] for p in pins}), 40)

    def test_unsafe_urls(self):
        for url in ['javascript:alert(1)', 'http://i.pinimg.com/a', 'https://i.pinimg.com.evil/a',
                    'https://user:pass@i.pinimg.com/a', 'https://i.pinimg.com:444/a']:
            self.assertFalse(updater.safe_url(url, image=True))
        for url in ['https://evil.com/pin/1/', 'https://pinterest.com.evil/pin/1/', 'https://www.pinterest.com/login/']:
            self.assertFalse(updater.safe_url(url))

    def test_invalid_and_empty_leave_last_good_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'pinterest.json'
            updater.publish(rss(item()), target, '2026-10-28T00:00:00+00:00')
            before = target.read_bytes()
            for body in [b'<html>Forbidden</html>', b'{bad', rss(''), rss(item(description='<img src="javascript:bad">')),
                         b'<!DOCTYPE rss [<!ENTITY secret "bad">]><rss/>', b'x' * (updater.MAX_BYTES + 1)]:
                with self.assertRaises(Exception):
                    updater.publish(body, target)
                self.assertEqual(target.read_bytes(), before)
                self.assertFalse(target.with_suffix('.json.tmp').exists())
            self.assertEqual(json.loads(before)['count'], 1)


if __name__ == '__main__':
    unittest.main()
