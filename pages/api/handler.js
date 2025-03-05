export const runtime = 'edge';

export default async function handler(req, res) {
  // Read the body once
  const bodyData = await req.json();

  // Use bodyData in your logic instead of reading req.json() again
  res.status(200).json({ success: true });
}
