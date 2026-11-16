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

    with caplog.at_level(logging.INFO, logger=app.logger.name):
        response = client.post('/previewLabels', json={'data': {'text': 'hello'}})

    assert response.status_code == 500
    assert response.get_json() == {'error': 'cairo fell over'}
    assert any(r.getMessage().startswith('POST /previewLabels 500 ') for r in caplog.records)
    assert b'Traceback' not in response.data

    [record] = [r for r in caplog.records if r.exc_info]
    assert 'POST /previewLabels' in record.getMessage()
    assert isinstance(record.exc_info[1], RuntimeError)


@pytest.mark.parametrize('method, path, status', [
    ('get', '/no-such-route', 404),
    ('get', '/printers/discover', 405),
])
def test_http_errors_keep_their_status_as_json(client, caplog, method, path, status):
    with caplog.at_level(logging.INFO, logger=app.logger.name):
        response = getattr(client, method)(path)

    assert response.status_code == status
    assert set(response.get_json()) == {'error'}
    [event] = [r.getMessage() for r in caplog.records if r.getMessage().startswith(f'{method.upper()} {path} ')]
    assert f' {status} ' in event


def test_method_not_allowed_keeps_allow_header(client):
    response = client.get('/printers/discover')

    assert set(response.headers['Allow'].split(', ')) == {'OPTIONS', 'POST'}


def test_startup_autodiscovery_failure_is_logged_with_trace(caplog, monkeypatch):
    def explode():
        raise OSError("zeroconf unavailable")

    monkeypatch.setattr(app_module.printer_utils, 'discover_all_printers', explode)

    with caplog.at_level(logging.ERROR, logger=app.logger.name):
        app_module.run_startup_autodiscovery()

    [record] = [r for r in caplog.records if r.exc_info]
    assert record.getMessage() == 'Startup autodiscovery failed'
    assert isinstance(record.exc_info[1], OSError)


def test_find_available_port_raises_when_range_is_taken():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as held:
        held.bind(('0.0.0.0', 0))
        held.listen()
        taken = held.getsockname()[1]

        with pytest.raises(RuntimeError, match=f'^No free port in {taken}-{taken}$'):
            app_module.find_available_port(start_port=taken, max_attempts=1)
