@echo off
echo Installing Verentis OCR Backend...
pip install paddlepaddle==2.5.2 -i https://pypi.tuna.tsinghua.edu.cn/simple
pip install paddleocr==2.7.3
pip install fastapi==0.104.1 uvicorn==0.24.0
pip install PyMuPDF==1.23.8
pip install opencv-python-headless==4.8.1.78
pip install pillow==10.1.0 numpy==1.24.4 python-multipart==0.0.6
echo Installation complete!
pause
