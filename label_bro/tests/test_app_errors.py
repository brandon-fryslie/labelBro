import logging

import pytest

from label_bro.app import app


@pytest.fixture
def client():
    return app.test_client()


def test_server_error_returns_message_without_trace(client, caplog):
    with caplog.at_level(logging.ERROR, logger=app.logger.name):
        response = client.post('/previewLabels', json={'data': {'text': ''}})

    assert response.status_code == 500
    assert response.get_json() == {'error': 'Input is empty!'}
    assert b'Traceback' not in response.data

    [record] = [r for r in caplog.records if r.exc_info]
    assert 'POST /previewLabels' in record.getMessage()
    assert isinstance(record.exc_info[1], ValueError)


def test_unknown_route_keeps_its_http_status(client):
    response = client.get('/no-such-route')

    assert response.status_code == 404
