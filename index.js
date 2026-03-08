const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const crypto = require('crypto');

const DB_FILE = './users_db.json';

function loadDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: {}, sessions: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDatabase(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

let db = loadDatabase();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']
    }
});

client.on('qr', (qr) => {
    console.log('QR Code generated! Scan it with your phone:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

function caesarCipher(text, shift, isDecipher) {
    let shiftValue = parseInt(shift, 10);
    if (isNaN(shiftValue)) return "Please enter a valid number for shift.";

    if (isDecipher) {
        shiftValue = shiftValue * -1;
    }

    const newMessage = text.toUpperCase();
    let cypherMessage = "";

    for (const letter of newMessage) {
        if (alphabet.includes(letter)) {
            const p = alphabet.indexOf(letter);
            let newIndex = (p + shiftValue) % 26;
            // Handle negative modulus for JavaScript
            if (newIndex < 0) {
                newIndex += 26;
            }
            cypherMessage += alphabet[newIndex];
        } else {
            cypherMessage += letter;
        }
    }

    return cypherMessage;
}

client.on('message', async (message) => {
    const chat = await message.getChat();
    const sender = message.from;
    const parts = message.body.split(" ");
    const command = parts[0].toLowerCase();

    // 1. Registration command
    if (command === "!register") {
        if (parts.length < 2) {
            return await message.reply("Usage: !register PASSWORD");
        }
        if (db.users[sender]) {
            return await message.reply("You are already registered! Please use !login PASSWORD.");
        }

        const password = parts[1];
        db.users[sender] = {
            passwordHash: hashPassword(password),
            registeredAt: new Date().toISOString()
        };
        saveDatabase(db);
        return await message.reply("Registration successful! You can now use !login PASSWORD to log in.");
    }

    // 2. Login command
    if (command === "!login") {
        if (parts.length < 2) {
            return await message.reply("Usage: !login PASSWORD");
        }
        if (!db.users[sender]) {
            return await message.reply("You are not registered. Please use !register PASSWORD first.");
        }

        const password = parts[1];
        const hashed = hashPassword(password);

        if (db.users[sender].passwordHash === hashed) {
            db.sessions[sender] = {
                loggedInAt: new Date().toISOString()
            };
            saveDatabase(db);
            return await message.reply("Login successful! You are now authorized to use my commands.");
        } else {
            return await message.reply("Error: Incorrect password.");
        }
    }

    // 3. Logout command
    if (command === "!logout") {
        if (db.sessions[sender]) {
            delete db.sessions[sender];
            saveDatabase(db);
            return await message.reply("You have been logged out.");
        } else {
            return await message.reply("You are not logged in.");
        }
    }

    // 4. Require login for all other existing commands
    if (!db.sessions[sender]) {
        // We only enforce the block if they attempt to use known commands,
        // so the bot doesn't spam random chat messages with the security error
        const knownCommands = ["ping", "que", "!cypher", "!decypher"];
        if (knownCommands.includes(command)) {
            return await message.reply("Security Error: You must be logged in to use bot commands. Use !register PASSWORD or !login PASSWORD.");
        }
        return;
    }

    // --- Protected Commands Below ---

    if (message.body.toLocaleLowerCase() === "ping") {
        await message.reply("pong");
    } else if (message.body.toLowerCase() === "que") {
        // Use proper formatting or relative path for local images
        const filePath = "./papu.jpg";

        try {
            const media = MessageMedia.fromFilePath(filePath);

            await client.sendMessage(message.from, media, {
                sendMediaAsSticker: true,

                stickerAuthor: "Mybot",

                stickerName: "Sticker",
            });
        } catch (err) {
            console.error("failed to send sticker:", err);

        }
    } else if (message.body.toLowerCase().startsWith("!cypher ")) {
        // Splitting into command, text, and shift
        const parts = message.body.split(" ");
        if (parts.length >= 3) {
            const command = parts[0];
            const text = parts.slice(1, -1).join(" ");
            const shift = parts[parts.length - 1];

            const result = caesarCipher(text, shift, false);
            await message.reply(result);
        } else {
            await message.reply("Usage: !cypher WORD SHIFT (Example: !cypher HELLO 3)");
        }
    } else if (message.body.toLowerCase().startsWith("!decypher ")) {
        // Splitting into command, text, and shift
        const parts = message.body.split(" ");
        if (parts.length >= 3) {
            const command = parts[0];
            const text = parts.slice(1, -1).join(" ");
            const shift = parts[parts.length - 1];

            const result = caesarCipher(text, shift, true);
            await message.reply(result);
        } else {
            await message.reply("Usage: !decypher WORD SHIFT (Example: !decypher KHOOR 3)");
        }
    }

});

client.initialize();    
