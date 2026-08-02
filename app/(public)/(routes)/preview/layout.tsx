const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-card text-card-foreground min-h-screen">{children}</div>
  );
};
export default PublicLayout;
