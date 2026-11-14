# Catan Frontier Duel

A two-seat Catan variant played in the browser. A Node server on the host laptop owns the board, dice, private hands, trades, building legality and real-time harvest simulation. The visual client uses Three.js, original garden scenery and textured Meshy assets.

## Host a match

Use Node 22 or newer. The bundled client runs without installing dependencies.

```sh
npm start
```

Open http://127.0.0.1:8768 on the laptop for the blue seat. For remote play, keep the server running and expose that port through an HTTPS tunnel. With cloudflared installed, use:

```sh
cloudflared tunnel --url http://127.0.0.1:8768
```

Run the following command with the tunnel URL to print the coral player's invite. The URL fragment grants that seat access, including after a reload.

```sh
npm run invite -- https://YOUR-TUNNEL.trycloudflare.com
```

The default save is in the host user's Library/Application Support/Frontier Duel/room.json. Set CATAN_SAVE to a new file before launching for a fresh match. PORT changes the listening port. Keep the laptop awake and the tunnel running while playing.

## Rules

Blue and Coral place settlements and roads in snake order. Each player collects initial resources from their second settlement. The board uses a fixed 19-hex layout and nine coastal harbors. Players can trade with one another or the bank, build, and buy and play development cards. Longest Road and Largest Army are worth two points each. Ten victory points on your turn wins.

Production is the house rule. A settlement spawns one physical resource and a city spawns two on its matching hex. The owners of producing buildings enter a 45-second collection phase from opposite corners. Anyone participating can collect a token by touching it. A knockout returns the fighter to their starting corner. Unclaimed tokens return to the bank. A seven triggers discards and robber movement. Combat is exclusive to production. Harvest time pauses while a participating seat is disconnected.

WASD or arrow keys move, Space slashes, F throws a returning blade, and Shift dashes. Touch controls are available. Roaming during your main phase is peaceful.

## Rebuild the browser client

```sh
npm ci
npm run build
```
