def _reg_login(client, username: str, email: str, password: str, role: str = "player"):
    r = client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password, "role": role},
    )
    assert r.status_code == 201, r.text
    l = client.post("/api/v1/auth/login", data={"username": username, "password": password})
    assert l.status_code == 200, l.text
    return r.json(), {"Authorization": f"Bearer {l.json()['access_token']}"}


def test_events_conflicts_diplomacy_and_territory_draw(client):
    gm, gm_h = _reg_login(client, "gm_ext", "gm_ext@rolypoly.com", "secret123", role="gm")
    p1, p1_h = _reg_login(client, "pl_ext1", "pl_ext1@rolypoly.com", "secret123", role="player")
    p2, p2_h = _reg_login(client, "pl_ext2", "pl_ext2@rolypoly.com", "secret123", role="player")

    g = client.post(
        "/api/v1/games/",
        json={"title": "Extended Test", "start_year": 2026, "max_players": 4},
        headers=gm_h,
    ).json()
    gid = g["id"]
    client.post(f"/api/v1/games/{gid}/members?user_id={p1['id']}", headers=gm_h)
    client.post(f"/api/v1/games/{gid}/members?user_id={p2['id']}", headers=gm_h)

    c1 = client.post(
        f"/api/v1/countries/games/{gid}",
        json={"name": "Альфа", "color": "#4B91D1", "owner_user_id": p1["id"]},
        headers=gm_h,
    ).json()
    c2 = client.post(
        f"/api/v1/countries/games/{gid}",
        json={"name": "Бета", "color": "#D65C65", "owner_user_id": p2["id"]},
        headers=gm_h,
    ).json()

    # Рисование территории (создание напрямую)
    terr = client.post(
        "/api/v1/territories/",
        json={
            "game_id": gid,
            "name": "Новая провинция",
            "population": 500000,
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [[[[10.0, 50.0], [12.0, 50.0], [12.0, 52.0], [10.0, 52.0], [10.0, 50.0]]]],
            },
        },
        headers=gm_h,
    )
    assert terr.status_code == 201, terr.text
    assert terr.json()["name"] == "Новая провинция"

    # События: публичное и секретное
    ev_pub = client.post(
        "/api/v1/events/",
        json={"game_id": gid, "title": "Саммит", "text": "Открыт саммит", "category": "дипломатия", "visibility": "public"},
        headers=gm_h,
    )
    assert ev_pub.status_code == 201, ev_pub.text
    ev_sec = client.post(
        "/api/v1/events/",
        json={"game_id": gid, "title": "Тайная операция", "text": "Секрет", "category": "политика", "visibility": "secret"},
        headers=gm_h,
    )
    assert ev_sec.status_code == 201

    # Игрок не может создавать события
    assert (
        client.post(
            "/api/v1/events/",
            json={"game_id": gid, "title": "Фейк", "text": "Нет прав", "category": "политика", "visibility": "public"},
            headers=p1_h,
        ).status_code
        == 403
    )

    # Игрок видит только public (1), ведущий видит оба (2)
    assert len(client.get(f"/api/v1/events/games/{gid}", headers=p1_h).json()) == 1
    assert len(client.get(f"/api/v1/events/games/{gid}", headers=gm_h).json()) == 2

    # Конфликты (только ведущий создаёт/обновляет)
    assert (
        client.post(
            "/api/v1/conflicts/",
            json={"game_id": gid, "title": "Спор", "description": "Нет прав"},
            headers=p1_h,
        ).status_code
        == 403
    )
    conf = client.post(
        "/api/v1/conflicts/",
        json={
            "game_id": gid,
            "title": "Пограничный кризис",
            "description": "Спор за пролив",
            "participant_country_ids": [c1["id"], c2["id"]],
        },
        headers=gm_h,
    )
    assert conf.status_code == 201
    cid = conf.json()["id"]
    upd = client.patch(
        f"/api/v1/conflicts/{cid}",
        json={"status": "resolved", "results": "Подписано перемирие"},
        headers=gm_h,
    )
    assert upd.status_code == 200
    assert upd.json()["status"] == "resolved"

    # Дипломатические отношения
    rel = client.put(
        "/api/v1/diplomacy/relations",
        json={"game_id": gid, "country_a_id": c1["id"], "country_b_id": c2["id"], "relation_score": -35, "status": "tense"},
        headers=gm_h,
    )
    assert rel.status_code == 200
    assert rel.json()["relation_score"] == -35
