const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const qrcode = require('qrcode-terminal');

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

    if (message.body.toLocaleLowerCase() === "ping") {
        await message.reply("putos todos");
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
