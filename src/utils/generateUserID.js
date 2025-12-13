function generateCandidateUID(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let uid = '';
  for (let i = 0; i < length; i++) uid += chars.charAt(Math.floor(Math.random() * chars.length));
  return uid;
}

async function generateUniqueUID(UserModel) {
  while (true) {
    const uid = generateCandidateUID(6);
    const exists = await UserModel.exists({ uid });
    if (!exists) return uid;
  }
}

module.exports = { generateCandidateUID, generateUniqueUID };
