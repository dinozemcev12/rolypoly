def _register_and_login(client, username: str, email: str, password: str, role: str = "player"):
    reg = client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password, "role": role},
    )
    assert reg.status_code == 201, reg.text
    login = client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": password},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return reg.json(), {"Authorization": f"Bearer {token}"}


def test_full_mvp_gameplay_and_isolation(client):
    # 1. Регистрация ведущего, двух игроков и постороннего игрока
    gm_user, gm_headers = _register_and_login(client, "gm_master", "gm@rolypoly.com", "secret123", role="gm")
    p1_user, p1_headers = _register_and_login(client, "player1", "p1@rolypoly.com", "secret123", role="player")
    p2_user, p2_headers = _register_and_login(client, "player2", "p2@rolypoly.com", "secret123", role="player")
    outsider, outsider_headers = _register_and_login(client, "outsider", "out@rolypoly.com", "secret123", role="player")

    # Игрок не может создать игру
    forbidden_game = client.post(
        "/api/v1/games/",
        json={"title": "Нелегальная игра", "start_year": 2026, "max_players": 4},
        headers=p1_headers,
    )
    assert forbidden_game.status_code == 403

    # 2. Ведущий создаёт игровую сессию
    game_resp = client.post(
        "/api/v1/games/",
        json={"title": "Европа 2026", "description": "Тестовая кампания", "start_year": 2026, "max_players": 6},
        headers=gm_headers,
    )
    assert game_resp.status_code == 201, game_resp.text
    game = game_resp.json()
    game_id = game["id"]

    # 3. Приглашение игроков в сессию
    m1 = client.post(f"/api/v1/games/{game_id}/members?user_id={p1_user['id']}", headers=gm_headers)
    assert m1.status_code == 201
    m2 = client.post(f"/api/v1/games/{game_id}/members?user_id={p2_user['id']}", headers=gm_headers)
    assert m2.status_code == 201

    # Изоляция сессий: outsider не имеет доступа к игре, странам, территориям и истории
    assert client.get(f"/api/v1/games/{game_id}", headers=outsider_headers).status_code == 403
    assert client.get(f"/api/v1/countries/games/{game_id}", headers=outsider_headers).status_code == 403
    assert client.get(f"/api/v1/territories/games/{game_id}", headers=outsider_headers).status_code == 403
    assert client.get(f"/api/v1/history/games/{game_id}", headers=outsider_headers).status_code == 403

    # 4. Создание государств и назначение игроков
    c1_resp = client.post(
        f"/api/v1/countries/games/{game_id}",
        json={
            "name": "Северная Республика",
            "color": "#4B91D1",
            "treasury": 1000,
            "income": 300,
            "expenses": 100,
            "owner_user_id": p1_user["id"],
        },
        headers=gm_headers,
    )
    assert c1_resp.status_code == 201, c1_resp.text
    c1 = c1_resp.json()

    c2_resp = client.post(
        f"/api/v1/countries/games/{game_id}",
        json={
            "name": "Южный Союз",
            "color": "#D65C65",
            "treasury": 800,
            "income": 200,
            "expenses": 50,
            "owner_user_id": p2_user["id"],
        },
        headers=gm_headers,
    )
    assert c2_resp.status_code == 201
    c2 = c2_resp.json()

    # 5. Импорт GeoJSON и назначение владельца территории
    geojson_payload = {
        "geojson": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "Столичный округ", "population": 2500000},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[37.4, 55.6], [37.7, 55.6], [37.7, 55.8], [37.4, 55.8], [37.4, 55.6]]],
                    },
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Южный берег", "population": 1200000},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.0, 45.0], [31.0, 45.0], [31.0, 46.0], [30.0, 46.0], [30.0, 45.0]]],
                    },
                },
            ],
        }
    }
    imp_resp = client.post(
        f"/api/v1/territories/games/{game_id}/import-geojson",
        json=geojson_payload,
        headers=gm_headers,
    )
    assert imp_resp.status_code == 201, imp_resp.text
    imported = imp_resp.json()
    assert imported["imported_count"] == 2
    t1_id = imported["territories"][0]["id"]

    # Игрок не может менять владельца территории
    assert (
        client.post(
            f"/api/v1/territories/{t1_id}/owner",
            json={"country_id": c1["id"]},
            headers=p1_headers,
        ).status_code
        == 403
    )

    # Ведущий назначает владельца территории
    assign_resp = client.post(
        f"/api/v1/territories/{t1_id}/owner",
        json={"country_id": c1["id"]},
        headers=gm_headers,
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["country_id"] == c1["id"]

    # 6. Приказы: игрок создаёт и отправляет, ведущий одобряет
    order_resp = client.post(
        "/api/v1/orders/",
        json={
            "game_id": game_id,
            "country_id": c1["id"],
            "title": "Строительство порта",
            "category": "экономика",
            "description": "Расширить торговый терминал на 20%",
        },
        headers=p1_headers,
    )
    assert order_resp.status_code == 201, order_resp.text
    order_id = order_resp.json()["id"]

    send_resp = client.post(f"/api/v1/orders/{order_id}/send", headers=p1_headers)
    assert send_resp.status_code == 200
    assert send_resp.json()["status"] == "sent"

    # Игрок не может сам одобрить приказ
    assert (
        client.post(
            f"/api/v1/orders/{order_id}/decision",
            json={"status": "accepted"},
            headers=p1_headers,
        ).status_code
        == 403
    )

    dec_resp = client.post(
        f"/api/v1/orders/{order_id}/decision",
        json={"status": "accepted", "gm_comment": "Одобрено, +50 к доходу"},
        headers=gm_headers,
    )
    assert dec_resp.status_code == 200
    assert dec_resp.json()["status"] == "accepted"

    # 7. Финансовая операция (изменение казны)
    tx_resp = client.post(
        "/api/v1/transactions/",
        json={"country_id": c1["id"], "amount": 250, "type": "income", "reason": "Торговая пошлина"},
        headers=gm_headers,
    )
    assert tx_resp.status_code == 201, tx_resp.text
    c1_after_tx = client.get(f"/api/v1/countries/{c1['id']}", headers=p1_headers).json()
    assert c1_after_tx["treasury"] == 1250

    # 8. Игровые ходы: start -> finish_review -> resolve -> next
    t_start = client.post(f"/api/v1/turns/games/{game_id}/action", json={"action": "start"}, headers=gm_headers)
    assert t_start.status_code == 200
    assert t_start.json()["turn_number"] == 1

    t_rev = client.post(f"/api/v1/turns/games/{game_id}/action", json={"action": "finish_review"}, headers=gm_headers)
    assert t_rev.status_code == 200
    assert t_rev.json()["status"] == "review"

    t_res = client.post(f"/api/v1/turns/games/{game_id}/action", json={"action": "resolve"}, headers=gm_headers)
    assert t_res.status_code == 200
    assert t_res.json()["status"] == "resolved"

    # Проверяем формулу казны: 1250 + 300 - 100 = 1450
    c1_after_turn = client.get(f"/api/v1/countries/{c1['id']}", headers=p1_headers).json()
    assert c1_after_turn["treasury"] == 1450

    t_next = client.post(f"/api/v1/turns/games/{game_id}/action", json={"action": "next"}, headers=gm_headers)
    assert t_next.status_code == 200
    assert t_next.json()["turn_number"] == 2
    assert t_next.json()["month_start"] == "2026-02"

    # 9. Дипломатия (секретный договор виден участникам, но скрыт от третьих лиц? — проверим с p1/p2)
    secret_treaty = client.post(
        "/api/v1/diplomacy/treaties",
        json={
            "game_id": game_id,
            "title": "Секретный пакт",
            "type": "alliance",
            "country_a_id": c1["id"],
            "country_b_id": c2["id"],
            "is_secret": True,
            "terms": "Взаимная поддержка",
        },
        headers=p1_headers,
    )
    assert secret_treaty.status_code == 201
    assert len(client.get(f"/api/v1/diplomacy/games/{game_id}/treaties", headers=p2_headers).json()) == 1

    # 10. Журнал истории содержит записи о ключевых событиях
    history = client.get(f"/api/v1/history/games/{game_id}", headers=p1_headers).json()
    assert len(history) >= 5
