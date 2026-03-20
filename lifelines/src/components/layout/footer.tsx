export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-responsive py-12">
        <div className="flex justify-center items-center">
          <div className="text-center text-white">
            &copy; {new Date().getFullYear()} A ministry of Saint Helen Church, Westfield, New Jersey
          </div>
        </div>
      </div>
    </footer>
  )
}
