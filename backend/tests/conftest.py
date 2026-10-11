import os

# Тесты не трогают базу демо: состояние банка только в памяти
os.environ["PERSIST_STATE"] = "0"
