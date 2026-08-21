import urllib.request
import json

base_url = "http://localhost:8100/api"

# 1. Login to get JWT token
login_data = json.dumps({"username": "SuperAdmin", "password": "123"}).encode('utf-8')
req = urllib.request.Request(f"{base_url}/auth/login", data=login_data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as resp:
        res_json = json.loads(resp.read().decode('utf-8'))
        data_body = res_json.get('data', res_json)
        token = data_body.get('token')
        print("Login successful! Token:", token[:20], "...")
        
        # 2. Call COO API
        req_coo = urllib.request.Request(f"{base_url}/coo/erp-materials?poNumber=0902952505", headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        })
        with urllib.request.urlopen(req_coo) as resp_coo:
            data = json.loads(resp_coo.read().decode('utf-8'))
            items = data.get('data', [])
            print(f"\nAPI returned {len(items)} items for PO 0902952505:")
            for i, item in enumerate(items):
                print(f"  Row {i+1}: MatCode={item.get('materialCode')} | DeclNo={item.get('declarationNumber')} | missingFromWeekly={item.get('missingFromWeekly')} | isMainFabric={item.get('isMainFabric')}")
except Exception as e:
    print("API Error:", e)
