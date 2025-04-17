import fs from "fs";
import cryptoPackage from "crypto";

const fileName = "random-bytes.bin";

const writer = fs.createWriteStream(fileName);

export default async function writetoStream(bytesToWrite, callback) {
    const step = 1000;
    let i = bytesToWrite;

    return new Promise((resolve, reject) => {
        function write() {
            let ok = true;
            do {
                const chunkSize = i > step ? step : i;
                const buffer = cryptoPackage.randomBytes(chunkSize);

                i -= chunkSize;
                if (i === 0) {
                    // Last write
                    writer.write(buffer, err => {
                        if (callback) callback(err);
                        resolve(fileName);
                    });
                } else {
                    ok = writer.write(buffer);
                }
            } while (i > 0 && ok);

            if (i > 0) {
                writer.once('drain', write);
            }
        }

        write();
    });
}
