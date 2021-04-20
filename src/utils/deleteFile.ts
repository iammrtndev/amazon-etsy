import fs from 'fs';
export default async function deleteFile(path: string) {
  fs.unlink(path, (error) => {
    throw error;
  });
}
