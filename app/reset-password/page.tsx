import { PasswordForm } from '@/components/password-form'
import { requireCitizen } from '@/modules/auth/session'
export const dynamic='force-dynamic'
export default async function ResetPassword(){await requireCitizen();return <section className="narrow-page"><h1>Choose a new password.</h1><p className="lede">Use a strong password you don’t use elsewhere.</p><PasswordForm reset/></section>}
