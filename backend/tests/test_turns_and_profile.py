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


def test_profile_invite_by_username_turns_and_ws(client):
    gm_user, gm_headers = _register_and_login(client, "gm_turns", "gm_turns@rolypoly.com", "secret123", role="gm")
    p_user, p_headers = _register_and_login(client, "player_turns", "pt@rolypoly.com", "secret123", role="player")

    # 1. Обновление профиля и смена пароля
    upd = client.patch(
        "/api/v1/users/me",
        json={"full_name": "Великий Ведущий"},
        headers=gm_headers,
    )
    assert upd.status_code == 200, upd.text
    assert upd.json()["full_name"] == "Великий Ведущий"

    pw_chg = client.post(
        "/api/v1/users/me/change-password",
        json={"current_password": "secret123", "new_password": "newsecret456"},
        headers=p_headers,
    )
    assert pw_chg.status_code == 200, pw_chg.text

    relogin = client.post(
        "/api/v1/auth/login",
        data={"username": "player_turns", "password": "newsecret456"},
    )
    assert relogin.status_code == 200, relogin.text

    # 2. Создание игры и приглашение игрока по username
    g_resp = client.post(
        "/api/v1/games/",
        json={"title": "Тест ходов", "start_year": 2026, "max_players": 4},
        headers=gm_headers,
    )
    assert g_resp.status_code == 201, g_resp.text
    game_id = g_resp.json()["id"]

    inv = client.post(
        f"/api/v1/games/{game_id}/members?username=player_turns",
        headers=gm_headers,
    )
    assert inv.status_code == 201, inv.text
    assert inv.json()["username"] == "player_turns"

    members = client.get(f"/api/v1/games/{game_id}/members", headers=gm_headers)
    assert members.status_code == 200, members.text
    assert len(members.json()) == 2

    # 3. Создаём страну с начальной казной, доходом и расходом
    c_resp = client.post(
        f"/api/v1/countries/games/{game_id}",
        json={
            "name": "Республика Тест",
            "color": "#3EAC83",
            "owner_user_id": p_user["id"],
            "treasury": 1000.0,
            "income": 300.0,
            "expenses": 120.0,
        },
        headers=gm_headers,
    )
    assert c_resp.status_code == 201, c_resp.text
    country_id = c_resp.json()["id"]

    # 4. Цикл хода: start -> finish_review -> resolve -> next
    for action in ("start", "finish_review", "resolve", "next"):
        t_resp = client.post(
            f"/api/v1/turns/games/{game_id}/action",
            json={"action": action},
            headers=gm_headers,
        )
        assert t_resp.status_code == 200, f"{action}: {t_resp.text}"

    # После resolve казна должна увеличиться на (300 - 120) = 180 -> 1180
    c_after = client.get(f"/api/v1/countries/{country_id}", headers=gm_headers)
    assert c_after.status_code == 200, c_after.text
    assert c_after.json()["treasury"] == 1180.0

    # 5. Запись в историю через endpoint
    h_resp = client.post(
        f"/api/v1/history/games/{game_id}/entries",
        params={"action_type": "manual_note", "description": "Запись ведущего"},
        headers=gm_headers,
    )
    assert h_resp.status_code == 201, h_resp.text

    # 6. Уведомления
    n_resp = client.get(f"/api/v1/notifications/games/{game_id}", headers=p_headers)
    assert n_resp.status_code == 200, n_resp.text

    # 7. WebSocket соединение
    with client.websocket_connect(f"/ws/{game_id}") as ws:
        ws.send_json({"type": "hello"})
        msg = ws.receive_json()
        assert msg["event"] == "ping"

    # 8. Загрузка файла (флаг / подложка карты)
    up_resp = client.post(
        "/api/v1/uploads/",
        files={"file": ("flag.png", b"\x89PNG\r\n\x1a\nfake", "image/png")},
        headers=gm_headers,
    )
    assert up_resp.status_code == 201, up_resp.text
    assert up_resp.json()["url"].startswith("/uploads/")

    # 9. Экономический проект
    pr_resp = client.post(
        "/api/v1/projects/",
        json={"country_id": country_id, "name": "Северный порт", "cost": 500, "status": "planned"},
        headers=p_headers,
    )
    assert pr_resp.status_code == 201, pr_resp.text
    pr_id = pr_resp.json()["id"]
    pr_upd = client.patch(
        f"/api/v1/projects/{pr_id}",
        json={"status": "active"},
        headers=gm_headers,
    )
    assert pr_upd.status_code == 200, pr_upd.text
    assert pr_upd.json()["status"] == "active"

    # 10. Дипломатическое сообщение
    msg_resp = client.post(
        "/api/v1/messages/",
        json={
            "game_id": game_id,
            "recipient_country_id": country_id,
            "subject": "Торговая нота",
            "body": "Предлагаем снизить пошлины.",
            "is_secret": True,
        },
        headers=gm_headers,
    )
    assert msg_resp.status_code == 201, msg_resp.text
    msgs_list = client.get(f"/api/v1/messages/games/{game_id}", headers=p_headers)
    assert msgs_list.status_code == 200, msgs_list.text
    assert any(m["subject"] == "Торговая нота" for m in msgs_list.json())

    # 11. Импорт стран и территорий по историческому году сценария (1914)
    hist_resp = client.post(
        f"/api/v1/territories/games/{game_id}/import-by-year",
        json={"year": 1914, "create_countries": True, "replace_existing": True},
        headers=gm_headers,
    )
    assert hist_resp.status_code == 200, hist_resp.text
    hist_data = hist_resp.json()
    assert hist_data["matched_year"] == 1914
    assert hist_data["created_countries_count"] > 10
    assert hist_data["imported_territories_count"] > 50
