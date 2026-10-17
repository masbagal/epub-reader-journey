/**
 * Attaching some useful resource here
 * - https://medium.com/@felixstridsberg/the-zip-file-format-6c8a160d1c34
 *
 *
 */

const fs = require("node:fs");

// not a magic number, comes from zip file spec;
// offset counted from each central directory entry
// 46 comes from skipping all metadata before the bytes that includes name offset
const NAME_OFFSET = 46;

const filePath = process.argv[2];

const fileBuffer = fs.readFileSync(filePath);

const eocdMarkerSequence = [80, 75, 5, 6]; // 50, 4b, 05, 06

const eocdSequence = [0x50, 0x4b, 0x05, 0x06];

function findEocd(buffer) {
  for (let i = buffer.length - eocdSequence.length - 1; i >= 0; i--) {
    for (let x = 0; x < eocdMarkerSequence.length; x++) {
      if (buffer[i + x] !== eocdMarkerSequence[x]) {
        break;
      }
      if (x === eocdSequence.length - 1) {
        return i;
      }
    }
  }

  return -1;
}

const eocdIndex = findEocd(fileBuffer);
// -- ZIP FORMAT on eocd
// 50 4b 05 06 | 00 00 | 00 00 | 01 00 | 01 00 | 51 00 00 00 | 52 00 00 00 | 00 00
// signature     disk#   cdDisk  entries  total    cdSize=81      cdOffset=82    commentLen
//               (+4)    (+6)    (+8)     (+10)    (+12)          (+16)          (+20)
//

const centralDirectoryIndex = fileBuffer.readUInt32LE(eocdIndex + 16);

let entryStartIndex = centralDirectoryIndex;
const names = [];
while (entryStartIndex < eocdIndex) {
  const nameLenIndex = entryStartIndex + 28;
  const extraFieldLenIndex = entryStartIndex + 30;
  const fileCommentLenIndex = entryStartIndex + 32;
  const localOffsetIndex = entryStartIndex + 42;

  const fileNameLength = fileBuffer.readUInt16LE(nameLenIndex);
  const extraFieldLength = fileBuffer.readUInt16LE(extraFieldLenIndex);
  const fileCommentLength = fileBuffer.readUInt16LE(fileCommentLenIndex);
  const localOffsetHeader = fileBuffer.readUInt32LE(localOffsetIndex);

  const name = fileBuffer.toString(
    "utf-8",
    entryStartIndex + 46,
    entryStartIndex + 46 + fileNameLength,
  );

  names.push(name);

  const entryTotalBytes =
    NAME_OFFSET + fileNameLength + extraFieldLength + fileCommentLength;

  entryStartIndex += entryTotalBytes;
}

console.log(names);
