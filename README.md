# microservice-github
Microservice that connects github information with the Smart Contract of the Network

# Local Dev
## Start postgresdb on docker

First time
```bash
docker run -d --name github-db -p 54320:5432 -e POSTGRES_PASSWORD=github -e POSTGRES_DB=github -e POSTGRES_USER=github postgres:13
```
After that
```bash
docker start github-db
```

## Run microservice
```bash
npm start
```