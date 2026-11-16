import logging
import socket

import pytest

from label_bro import app as app_module
from label_bro.app import app


@pytest.fixture
def client():
    return app.test_client()


def test_server_error_returns_message_without_trace(client, caplog, monkeypatch):
    def explode(text, width):
        raise RuntimeError("cairo fell over")

    monkeypatch.setattr(app_module.label_creation, 'create_full_width_label_image', explode)

    with caplog.at_level(logging.ERROR, logger=app.logger.name):
        response = client.post('/previewLabels', json={'data': {'text': 'hello'}})

    assert response.status_code == 500
    assert response.get_json() == {'error': 'cairo fell over'}
    assert b'Traceback' not in response.data

    [record] = [r for r in caplog.records if r.exc_info]
    assert 'POST /previewLabels' in record.getMessage()
    assert isinstance(record.exc_info[1], RuntimeError)


@pytest.mark.parametrize('method, path, status', [
    ('get', '/no-such-route', 404),
    ('get', '/printers/discover', 405),
])
def test_http_errors_keep_their_status_as_json(client, method, path, status):
    response = getattr(client, method)(path)

    assert response.status_code == status
    assert set(response.get_json()) == {'error'}


def test_find_available_port_raises_when_range_is_taken():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as held:
        held.bind(('0.0.0.0', 0))
        taken = held.getsockname()[1]

        with pytest.raises(RuntimeError, match=str(taken)):
            app_module.find_available_port(start_port=taken, max_attempts=1)
