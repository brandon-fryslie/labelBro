import pytest

from label_bro.utils.quicksnmp import SNMPPacket


@pytest.mark.parametrize(
    "value, encoded",
    [
        (0, b"\x02\x01\x00"),
        (127, b"\x02\x01\x7f"),
        (128, b"\x02\x02\x00\x80"),
        (255, b"\x02\x02\x00\xff"),
        (32767, b"\x02\x02\x7f\xff"),
        (-1, b"\x02\x01\xff"),
    ],
)
def test_encode_integer_is_ber_twos_complement(value, encoded):
    assert SNMPPacket.encode_integer(value) == encoded
