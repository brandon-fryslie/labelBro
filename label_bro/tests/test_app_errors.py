import logging
import socket

import pytest

from label_bro import app as app_module
from label_bro.app import app
from label_bro.utils.printer_utils import PrinterInfo


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
    assert b'Traceback' not in response.data

    # One event for the request, carrying the trace.
    [event] = [r for r in caplog.records if r.getMessage().startswith('POST /previewLabels ')]
    assert event.levelno == logging.ERROR
    assert ' 500 ' in event.getMessage()
    assert isinstance(event.exc_info[1], RuntimeError)


@pytest.mark.parametrize('method, path, status', [
    ('get', '/no-such-route', 404),
    ('get', '/printers/discover', 405),
])
def test_http_errors_keep_their_status_as_json(client, caplog, method, path, status):
    with caplog.at_level(logging.INFO, logger=app.logger.name):
        response = getattr(client, method)(path)

    assert response.status_code == status
    assert set(response.get_json()) == {'error'}
    [event] = [r for r in caplog.records if r.getMessage().startswith(f'{method.upper()} {path} ')]
    assert f' {status} ' in event.getMessage()
    assert event.levelno == logging.INFO
    assert not event.exc_info


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


def test_startup_autodiscovery_logs_printer_count(caplog, monkeypatch):
    printer = PrinterInfo(identifier='tcp://10.0.0.5:9100', model_number='QL-810W',
                          label_size='62', backend='network', display_name='QL-810W')
    monkeypatch.setattr(app_module.printer_utils, 'discover_all_printers', lambda: {'net_1': printer})

    with caplog.at_level(logging.INFO, logger=app.logger.name):
        app_module.run_startup_autodiscovery()

    messages = [r.getMessage() for r in caplog.records]
    assert 'Startup autodiscovery complete: 1 printers found' in messages
    assert '  - net_1: QL-810W (network)' in messages


def test_manual_connection_registers_ready_printer(client, caplog, monkeypatch):
    registry = {}
    monkeypatch.setattr(app_module.printer_utils, '_discovered_printers', registry)
    monkeypatch.setattr(app_module.printer_utils, 'test_manual_connection', lambda target: {
        'success': True,
        'printers_found': [{'ip': '10.0.0.7', 'model': 'QL-800', 'media_loaded': True, 'printer_ready': True}],
    })

    with caplog.at_level(logging.INFO, logger=app.logger.name):
        response = client.post('/printers/test', json={'target': '10.0.0.7'})

    assert response.status_code == 200
    assert registry['manual_10_0_0_7'].identifier == 'tcp://10.0.0.7:9100'
    assert 'Added manual printer to registry: manual_10_0_0_7' in [r.getMessage() for r in caplog.records]


def test_find_available_port_raises_when_range_is_taken():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as held:
        held.bind(('0.0.0.0', 0))
        held.listen()
        taken = held.getsockname()[1]

        with pytest.raises(RuntimeError, match=f'^No free port in {taken}-{taken}$'):
            app_module.find_available_port(start_port=taken, max_attempts=1)



def test_index_without_frontend_bundle_names_the_build_command(client, caplog, monkeypatch, tmp_path):
    monkeypatch.setattr(app, 'static_folder', str(tmp_path))

    with caplog.at_level(logging.ERROR):
        response = client.get('/')

    assert response.status_code == 500
    error = response.get_json()['error']
    assert 'run `pnpm install && pnpm build`' in error
    assert str(tmp_path) not in error
    assert 'GET / 500' in caplog.text


def test_index_loads_the_frontend_bundle(client, monkeypatch, tmp_path):
    bundle = tmp_path / app_module.FRONTEND_BUNDLE
    bundle.parent.mkdir()
    bundle.write_text('')
    monkeypatch.setattr(app, 'static_folder', str(tmp_path))

    page = client.get('/').get_data(as_text=True)

    assert f'/static/{app_module.FRONTEND_BUNDLE}' in page
