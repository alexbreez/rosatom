"""
Country configuration: language mappings and top news media domains.
Each country entry includes its official language code (ISO 639-1),
language name, and a list of the top 20 news media domains.
"""

COUNTRIES = {
    "Germany": {
        "language_code": "de",
        "language_name": "German",
        "media_domains": [
            "spiegel.de",
            "bild.de",
            "zeit.de",
            "faz.net",
            "sueddeutsche.de",
            "welt.de",
            "tagesschau.de",
            "stern.de",
            "focus.de",
            "handelsblatt.com",
            "tagesspiegel.de",
            "n-tv.de",
            "rnd.de",
            "berliner-zeitung.de",
            "merkur.de",
            "t-online.de",
            "zdf.de",
            "ndr.de",
            "br.de",
            "rp-online.de",
        ],
    },
    "Hungary": {
        "language_code": "hu",
        "language_name": "Hungarian",
        "media_domains": [
            "index.hu",
            "telex.hu",
            "hvg.hu",
            "origo.hu",
            "444.hu",
            "24.hu",
            "magyarnemzet.hu",
            "nepszava.hu",
            "portfolio.hu",
            "mfor.hu",
            "rtl.hu",
            "atv.hu",
            "hirado.hu",
            "mandiner.hu",
            "napi.hu",
            "infostart.hu",
            "blikk.hu",
            "penzcentrum.hu",
            "szabad-europa.hu",
            "g7.hu",
        ],
    },
    "Denmark": {
        "language_code": "da",
        "language_name": "Danish",
        "media_domains": [
            "dr.dk",
            "tv2.dk",
            "politiken.dk",
            "jyllands-posten.dk",
            "berlingske.dk",
            "ekstrabladet.dk",
            "bt.dk",
            "information.dk",
            "borsen.dk",
            "kristeligt-dagblad.dk",
            "weekendavisen.dk",
            "nyheder.tv2.dk",
            "fyens.dk",
            "nordjyske.dk",
            "stiften.dk",
            "sondagsavisen.dk",
            "avisen.dk",
            "arbejderen.dk",
            "altinget.dk",
            "zetland.dk",
        ],
    },
}


def get_country_config(country_name: str) -> dict | None:
    """Return the config dict for a given country, or None if not found."""
    return COUNTRIES.get(country_name)


def get_supported_countries() -> list[str]:
    """Return a sorted list of supported country names."""
    return sorted(COUNTRIES.keys())
