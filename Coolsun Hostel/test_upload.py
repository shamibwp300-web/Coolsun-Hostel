import urllib.request
import urllib.parse
import json
import os
import sys
import mimetypes

def multipart_encode(fields, files):
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = []
    for key, value in fields.items():
        body.extend([
            f'--{boundary}',
            f'Content-Disposition: form-data; name="{key}"',
            '',
            str(value)
        ])
    for key, file_info in files.items():
        filename, content = file_info
        mime_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        body.extend([
            f'--{boundary}',
            f'Content-Disposition: form-data; name="{key}"; filename="{filename}"',
            f'Content-Type: {mime_type}',
            ''
        ])
        body.append(content)
    body.extend([f'--{boundary}--', ''])
    
    encoded_body = bytearray()
    for item in body:
        if isinstance(item, bytes):
            encoded_body.extend(item)
            encoded_body.extend(b'\r\n')
        else:
            encoded_body.extend(item.encode('utf-8'))
            encoded_body.extend(b'\r\n')
            
    content_type = f'multipart/form-data; boundary={boundary}'
    return encoded_body, content_type

with open('dummy.jpg', 'wb') as f:
    f.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' \",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\xd2\x8f\xff\xd9')

print('Logging in...')
data = json.dumps({'username': 'ewardjain@gmail.com', 'password': 'Coolsun@23*+'}).encode('utf-8')
req = urllib.request.Request('https://hostel.coolsun.co.uk/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
try:
    response = urllib.request.urlopen(req)
    print('Login:', response.getcode())
    cookie = response.headers.get('Set-Cookie')
    if cookie:
        cookie = cookie.split(';')[0]
        
    print('Fetching records...')
    req2 = urllib.request.Request('https://hostel.coolsun.co.uk/api/police/records', headers={'Cookie': cookie})
    res2 = urllib.request.urlopen(req2)
    records = json.loads(res2.read())
    
    tenant_id = None
    for r in records:
        if r['name'] == 'Abdul kabir':
            tenant_id = r['id']
            break
            
    if not tenant_id and records:
        tenant_id = records[0]['id']
        
    if not tenant_id:
        print("No tenants found.")
        sys.exit()
        
    print('Uploading to tenant:', tenant_id)
    
    with open('dummy.jpg', 'rb') as f:
        img_data = f.read()
        
    body, ctype = multipart_encode({'type': 'ID_Front'}, {'file': ('dummy.jpg', img_data)})
    req3 = urllib.request.Request(f'https://hostel.coolsun.co.uk/api/police/upload/{tenant_id}', data=body, headers={'Cookie': cookie, 'Content-Type': ctype})
    
    res3 = urllib.request.urlopen(req3)
    upload_res = json.loads(res3.read())
    print('Upload response:', upload_res)
    
    doc_url = upload_res.get('document_url')
    if doc_url:
        print('Fetching uploaded doc:', doc_url)
        req4 = urllib.request.Request('https://hostel.coolsun.co.uk' + doc_url, headers={'Cookie': cookie})
        try:
            res4 = urllib.request.urlopen(req4)
            print('Doc fetch status:', res4.getcode())
            print('Doc fetch content length:', len(res4.read()))
        except urllib.error.HTTPError as e:
            print('Doc Fetch HTTP Error:', e.code, e.read().decode())
        
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code, e.read().decode())
except Exception as e:
    print('Error:', e)
