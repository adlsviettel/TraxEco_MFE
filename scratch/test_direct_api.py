import urllib.request
import json

url = "http://localhost:8100/api/coo/erp-materials?poNumber=0902952505"
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        items = data.get('data', [])
        print(f"API returned {len(items)} items for PO 0902952505:")
        for i, item in enumerate(items):
            print(f"  Row {i+1}: MatCode={item.get('materialCode')} | DeclNo={item.get('declarationNumber')} | missingFromWeekly={item.get('missingFromWeekly')} | isMainFabric={item.get('isMainFabric')}")
except Exception as e:
    print("API Error:", e)
