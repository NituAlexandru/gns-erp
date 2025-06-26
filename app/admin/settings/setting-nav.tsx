'use client'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  Info,
  Package,
  SettingsIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const SettingNav = () => {
  const [active, setActive] = useState('')

  useEffect(() => {
    const sections = document.querySelectorAll('div[id^="setting-"]')
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { threshold: 0.6, rootMargin: '0px 0px -40% 0px' }
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const handleScroll = (id: string) => {
    const sec = document.getElementById(id)
    if (sec) window.scrollTo({ top: sec.offsetTop - 16, behavior: 'smooth' })
  }

  return (
    <div>
      <h1 className='h1-bold'>Setări</h1>
      <nav className='flex md:flex-col gap-2 md:fixed mt-4 flex-wrap'>
        {[
          { name: 'Site Info', hash: 'setting-site-info', icon: <Info /> },
          {
            name: 'Common Settings',
            hash: 'setting-common',
            icon: <SettingsIcon />,
          },
          {
            name: 'Payment Methods',
            hash: 'setting-payment-methods',
            icon: <CreditCard />,
          },
          {
            name: 'Delivery Dates',
            hash: 'setting-delivery-dates',
            icon: <Package />,
          },
        ].map((item) => (
          <Button
            key={item.hash}
            onClick={() => handleScroll(item.hash)}
            variant={active === item.hash ? 'outline' : 'ghost'}
            className={`justify-start ${active === item.hash ? '' : 'border-transparent'}`}
          >
            {item.icon}
            {item.name}
          </Button>
        ))}
      </nav>
    </div>
  )
}

export default SettingNav
