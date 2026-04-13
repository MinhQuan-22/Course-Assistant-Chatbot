import { MessageSquare, BookOpen, FileText, Users, Settings, LogOut, GraduationCap, BarChart3, ClipboardList, Plus } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const studentNav = [
  { title: 'Chat', url: '/chat', icon: MessageSquare },
  { title: 'Lịch sử chat', url: '/history', icon: FileText },
  { title: 'Trắc nghiệm', url: '/quiz', icon: ClipboardList },
  { title: 'Tài liệu', url: '/documents', icon: BookOpen },
];

const teacherNav = [
  { title: 'Chat', url: '/chat', icon: MessageSquare },
  { title: 'Tài liệu', url: '/documents', icon: FileText },
  { title: 'Trắc nghiệm', url: '/quiz', icon: ClipboardList },
  { title: 'Thống kê', url: '/stats', icon: BarChart3 },
];

const adminNav = [
  { title: 'Tổng quan', url: '/admin', icon: BarChart3 },
  { title: 'Người dùng', url: '/admin/users', icon: Users },
  { title: 'Tài liệu', url: '/documents', icon: FileText },
  { title: 'Cài đặt', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'teacher' ? teacherNav : studentNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 px-3 py-4">
            {!collapsed && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-sidebar-primary" />
                  <span className="font-semibold text-sidebar-foreground">SE Assistant</span>
                </div>
                <span className="text-[10px] text-sidebar-foreground/40 ml-7">Kỹ thuật Phần mềm</span>
              </div>
            )}
            {collapsed && <GraduationCap className="w-5 h-5 text-sidebar-primary mx-auto" />}
          </SidebarGroupLabel>

          {!collapsed && location.pathname.startsWith('/chat') && (
            <div className="px-3 mb-2">
              <Button
                size="sm"
                className="w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                onClick={() => navigate('/chat')}
              >
                <Plus className="w-4 h-4" />
                Cuộc trò chuyện mới
              </Button>
            </div>
          )}

          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin'}
                      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary text-sm font-semibold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user.role === 'student' ? 'Sinh viên' : user.role === 'teacher' ? 'Giáo viên' : 'Admin'}</p>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-sidebar-foreground/70 hover:bg-sidebar-accent">
              <LogOut className="w-4 h-4 mr-2" />
              {!collapsed && <span>Đăng xuất</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
