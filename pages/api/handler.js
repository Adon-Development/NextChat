export const runtime = 'edge';

export default async function handler(req, res) {
  // Clone the request object
  const clonedReq = req.clone();

  // Read the body from the original request
  const body1 = await req.json();

  // Read the body from the cloned request
  const body2 = await clonedReq.json();

  // Use body1 and body2 in your logic
  res.status(200).json({ success: true });
}
