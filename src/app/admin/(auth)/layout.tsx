import styles from '@/components/admin/admin.module.css'

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.adminAuthLayout}>
      {children}
    </div>
  )
}
