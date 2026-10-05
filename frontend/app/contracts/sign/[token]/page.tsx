import RiderSignForm from '@/components/contracts/RiderSignForm'

export default async function RiderSignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <RiderSignForm token={token} />
}
