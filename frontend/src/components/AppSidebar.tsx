import {
  MessageSquare,
  BookOpen,
  FileText,
  Users,
  Settings,
  LogOut,
  GraduationCap,
  BarChart3,
  ClipboardList,
  Plus,
  BookMarked,
  CalendarDays,
} from 'lucide-react';
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
  { title: 'Chat',        url: '/chat',     icon: MessageSquare },
  { title: 'Chat History',url: '/history',  icon: FileText      },
  { title: 'Quiz',        url: '/quiz',     icon: ClipboardList },
  { title: 'Lịch thi',   url: '/exam',     icon: CalendarDays  },
  { title: 'Documents',   url: '/documents',icon: BookOpen      },
];

const teacherNav = [
  { title: 'Quản lý Tài liệu', url: '/documents', icon: FileText },
  { title: 'Quản lý Bài Test', url: '/quizzes', icon: ClipboardList },
  { title: 'Thống kê Lớp học', url: '/stats', icon: BarChart3 },
];

const adminNav = [
  { title: 'Tổng quan',  url: '/admin',                icon: BarChart3  },
  { title: 'Người dùng', url: '/admin/users',           icon: Users      },
  { title: 'Học vụ',     url: '/admin/academic',        icon: BookMarked },
  { title: 'Lịch thi',   url: '/admin/exam-schedules',  icon: ClipboardList },
  { title: 'Thông báo',  url: '/admin/announcements',   icon: MessageSquare },
  { title: 'Tài liệu',   url: '/admin/documents',       icon: FileText   },
  { title: 'Cài đặt',    url: '/admin/settings',        icon: Settings   },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems =
    user?.role === 'admin'
      ? adminNav
      : user?.role === 'teacher'
      ? teacherNav
      : studentNav;

  const canStartNewChat = user?.role === 'student';

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
                  <span className="font-semibold text-sidebar-foreground">3N Chatbot</span>
                </div>
              </div>
            )}
            {collapsed && <GraduationCap className="w-5 h-5 text-sidebar-primary mx-auto" />}
          </SidebarGroupLabel>

          {!collapsed && canStartNewChat && location.pathname.startsWith('/chat') && (
            <div className="px-3 mb-2">
              <Button
                size="sm"
                className="w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                onClick={() => navigate('/chat?new=true')}
              >
                <Plus className="w-4 h-4" />
                New Chat
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
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {user.role === 'student'
                  ? 'Student'
                  : user.role === 'teacher'
                  ? 'Teacher'
                  : 'Admin'}
              </p>
            </div>
          </div>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-sidebar-foreground/70 hover:bg-sidebar-accent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {!collapsed && <span>Log Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}