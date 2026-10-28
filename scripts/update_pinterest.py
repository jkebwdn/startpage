#!/usr/bin/env python3
"""One public RSS request; publish validated JSON atomically or retain last good data."""
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

SOURCE = 'https://uk.pinterest.com/jkebwdn/feed.rss'
MAX_BYTES = 2_000_000


def safe_url(value, image=False):
    try:
        url = urlsplit(value)
        host = url.hostname or ''
        allowed = host == 'i.pinimg.com' if image else (host == 'pinterest.com' or host.endswith('.pinterest.com'))
        return value if (url.scheme == 'https' and allowed and not url.username and not url.password
                         and url.port in (None, 443) and (image or re.fullmatch(r'/pin/\d+/?', url.path))) else ''
    except (ValueError, TypeError):
        return ''


class ImageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.image = ''

    def handle_starttag(self, tag, attrs):
        if tag == 'img' and not self.image:
            self.image = safe_url(dict(attrs).get('src', ''), image=True)


def parse_feed(body):
    if len(body) > MAX_BYTES or b'<!DOCTYPE' in body.upper() or b'<!ENTITY' in body.upper():
        raise ValueError('Oversized feed or unsupported XML declarations')
    root = ET.fromstring(body)
    if root.tag != 'rss' or root.find('channel') is None:
        raise ValueError('Expected RSS channel, not HTML/challenge content')
    pins, seen = [], set()
    for item in root.findall('./channel/item'):
        link = safe_url((item.findtext('link') or '').strip())
        parser = ImageParser()
        parser.feed(item.findtext('description') or '')
        thumbnail = parser.image
        if not link or not thumbnail or link in seen:
            continue
        seen.add(link)
        image = re.sub(r'^(https://i\.pinimg\.com/)(236x|474x)/', r'\g<1>736x/', thumbnail)
        pins.append({'title': (item.findtext('title') or '').strip()[:300], 'link': link,
                     'image': image, 'thumbnail': thumbnail})
        if len(pins) == 40:
            break
    if not pins:
        raise ValueError('No usable Pins; retaining last-known-good feed')
    return pins


def publish(body, target, now=None):
    pins = parse_feed(body)
    data = {'version': 1, 'source': SOURCE,
            'updatedAt': now or datetime.now(timezone.utc).isoformat(), 'count': len(pins), 'pins': pins}
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.json.tmp')
    try:
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    return len(pins)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, help='Already-fetched RSS (offline validation/bootstrap)')
    parser.add_argument('--output', type=Path, default=Path('feed/pinterest.json'))
    args = parser.parse_args()
    try:
        if args.input:
            body = args.input.read_bytes()
        else:
            request = Request(SOURCE, headers={'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9',
                                               'User-Agent': 'StartpageFeed/1.0 (+https://github.com/jkebwdn/startpage)'})
            with urlopen(request, timeout=30) as response:
                content_type = response.headers.get_content_type()
                if content_type not in ('application/rss+xml', 'application/xml', 'text/xml'):
                    raise ValueError('Upstream did not return XML')
                body = response.read(MAX_BYTES + 1)
        count = publish(body, args.output)
        print(f'Published {count} validated Pins')
    except Exception as error:
        # Never log remote response bodies, cookies or credentials.
        print(f'Feed refresh failed ({type(error).__name__}): {error}; previous JSON unchanged', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
