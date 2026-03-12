# This is our backend

## How to run

1. Set up environment variables

```bash
cp run.sh.template run.sh
```

Edit `run.sh` to contain correct values. (found in discord)

2. Make it executable

```bash
chmod +x run.sh
```

3. Start docker

```bash
docker-compose up -d
```

4. Run the application

```bash
./run.sh
```

## Tips

To properly shutdown docker and restart it use:

```bash
docker compose down -v
```

![Image](https://media1.tenor.com/m/lZmRtXcNlScAAAAd/rizzler-boom-rizzler-dance.gif)
