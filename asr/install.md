# 安装python3.11
'''
sudo dnf install -y python3.11
'''
# 激活空间
'''
python3.11 -m venv venv
'''
# 更新pip
'''
pip install -U pip
'''
# 安装依赖
'''
pip install "funasr==1.4.2" torch torchaudio more_itertools modelscope
pip install fastapi uvicorn python-multipart
'''

# 安装ffmepg
'''
 dnf install -y https://download1.rpmfusion.org/free/el/rpmfusion-free-release-8.noarch.rpm 2>&1 | tail -15
'''
