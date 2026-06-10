from copy import deepcopy
from urllib.parse import quote
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    original = deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


def test_get_activities_contains_known_activity():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data


def test_post_signup_adds_participant_and_returns_200():
    activity = "Chess Club"
    email = "new_student@example.com"
    url = f"/activities/{quote(activity)}/signup"
    resp = client.post(url, params={"email": email})
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]


def test_duplicate_signup_returns_400():
    activity = "Chess Club"
    existing_email = "michael@mergington.edu"
    url = f"/activities/{quote(activity)}/signup"
    resp = client.post(url, params={"email": existing_email})
    assert resp.status_code == 400


def test_delete_unregister_removes_participant_and_returns_200():
    activity = "Chess Club"
    email = "daniel@mergington.edu"
    url = f"/activities/{quote(activity)}/participants"
    resp = client.delete(url, params={"email": email})
    assert resp.status_code == 200
    assert email not in activities[activity]["participants"]


def test_unregister_nonexistent_participant_returns_404():
    activity = "Chess Club"
    email = "noone@example.com"
    url = f"/activities/{quote(activity)}/participants"
    resp = client.delete(url, params={"email": email})
    assert resp.status_code == 404


def test_signup_for_nonexistent_activity_returns_404():
    activity = "Nonexistent Activity"
    email = "someone@example.com"
    url = f"/activities/{quote(activity)}/signup"
    resp = client.post(url, params={"email": email})
    assert resp.status_code == 404
