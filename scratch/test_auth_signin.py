import urllib.request
import json

base_url = "http://localhost:8100/api"
login_data = json.dumps({"username": "SuperAdmin", "password": "123"}).encode('utf-8')
req = urllib.request.Request(f"{base_url}/auth/signin", data=login_data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as resp:
        print("Login resp:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error code:", e.code)
    body = e.read().decode('utf-8')
    with open('scratch/error.txt', 'w', encoding='utf-8') as f:
        f.write(body)
    print("Error saved to scratch/error.txt")
