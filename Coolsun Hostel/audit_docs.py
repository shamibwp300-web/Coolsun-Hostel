import urllib.request
import urllib.parse
import json
import os
import sys

print('Logging in...')
data = json.dumps({'username': 'ewardjain@gmail.com', 'password': 'Coolsun@23*+'}).encode('utf-8')
req = urllib.request.Request('https://hostel.coolsun.co.uk/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
try:
    response = urllib.request.urlopen(req)
    cookie = response.headers.get('Set-Cookie')
    if cookie:
        cookie = cookie.split(';')[0]
        
    print('Fetching records...')
    req2 = urllib.request.Request('https://hostel.coolsun.co.uk/api/police/records', headers={'Cookie': cookie})
    res2 = urllib.request.urlopen(req2)
    records = json.loads(res2.read())
    
    print(f'Found {len(records)} records.')
    
    for r in records:
        name = r['name']
        urls = {
            'ID Front': r.get('id_card_front_url'),
            'ID Back': r.get('id_card_back_url'),
            'Police Form': r.get('police_form_url'),
            'Agreement': r.get('agreement_url')
        }
        
        for label, url in urls.items():
            if url:
                print(f'Tenant: {name} | {label}: {url}')
                # Test fetch
                full_url = 'https://hostel.coolsun.co.uk' + url
                try:
                    img_req = urllib.request.Request(full_url, headers={'Cookie': cookie})
                    img_res = urllib.request.urlopen(img_req)
                    print(f'  [SUCCESS] Status: {img_res.getcode()}')
                except urllib.error.HTTPError as e:
                    print(f'  [FAILED] Status: {e.code}')
        
except Exception as e:
    print('Error:', e)
