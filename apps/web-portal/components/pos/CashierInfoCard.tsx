export function CashierInfoCard({ user }: any) {
  return (
    <div className="text-sm space-y-1">
      <div className="flex justify-between">
        <span>Name</span>
        <span className="font-medium">{user.name}</span>
      </div>
      <div className="flex justify-between">
        <span>Role</span>
        <span className="capitalize">{user.role}</span>
      </div>
      <div className="flex justify-between">
        <span>Branch</span>
        <span>{user.branch?.name}</span>
      </div>
    </div>
  );
}
