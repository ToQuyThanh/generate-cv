// Trang /templates đã được gộp vào /cv/new
// File này redirect về /cv/new để không break link cũ nếu có

import { redirect } from 'next/navigation'

export default function TemplatesRedirectPage() {
  redirect('/cv/new')
}
