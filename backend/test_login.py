import requests
resp = requests.post('http://127.0.0.1:8000/api/auth/login/', json={'identifier': 'admin.3n@tdtu.edu.vn', 'password': '123456'})
print(resp.status_code)
print(resp.text)
