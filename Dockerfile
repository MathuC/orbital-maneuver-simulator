FROM python:3.10-bookworm

RUN pip install --upgrade pip

COPY ./requirements.txt .
RUN pip install -r requirements.txt

COPY . .

WORKDIR .

COPY ./entrypoint.sh /
ENTRYPOINT ["sh", "/entrypoint.sh"]