import { ArrowLeft, ShieldCheck } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Reveal } from '../components/motion';

export default function TermsPage() {
  return (
    <div className="privacy-page">
      <div className="container">
        <Reveal>
          <div className="privacy-header">
            <Link to="/" className="back-link">
              <ArrowLeft size={16} /> Trở về trang chủ
            </Link>
            <div className="privacy-eyebrow">
              <ShieldCheck size={16} /> Pháp Lý & Điều Khoản
            </div>
            <h1 className="section-title">Quy Định Chung & Điều Khoản Dịch Vụ</h1>
            <p className="privacy-updated">Ban hành ngày 04/08/2026 · Áp dụng cho Hệ sinh thái QuackForge & ThreadScore</p>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="privacy-card legal-entity-card" style={{ marginBottom: '24px', background: 'rgba(255, 253, 248, 0.04)', border: '1px solid rgba(255, 253, 248, 0.12)', borderRadius: '14px', padding: '20px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Đơn vị sở hữu và quản lý:</strong> HỘ KINH DOANH QUACKFORGE</p>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Mã số thuế:</strong> 083204010221 do UBND Xã An Định cấp ngày 04/08/2026</p>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Đại diện pháp luật:</strong> Lương Duy Khang</p>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Địa chỉ trụ sở:</strong> số 135, Ấp Phú Lộc Thượng, Xã An Định, Tỉnh Vĩnh Long</p>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Điện thoại liên hệ:</strong> 0943505127 • <strong>Email:</strong> support@quackforge.xyz</p>
            <p style={{ margin: 0, fontSize: '13.5px' }}><strong>Khung giờ hỗ trợ:</strong> Từ 08:00 đến 22:00 hàng ngày (kể cả Thứ Bảy và Chủ Nhật)</p>
          </div>
        </Reveal>

        <div className="privacy-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', lineHeight: '1.7' }}>
          <Reveal delay={0.1}>
            <div className="privacy-card">
              <h3>1. Chấp Thuận Điều Khoản</h3>
              <p>
                Bằng việc truy cập website <strong>quackforge.xyz</strong>, sử dụng công cụ phân tích <strong>ThreadScore</strong> hoặc trải nghiệm bất kỳ dịch vụ số nào do chúng tôi cung cấp, người dùng xác nhận đã đọc, hiểu rõ và hoàn toàn đồng ý tuân thủ các Điều khoản dịch vụ này cùng các quy định có liên quan.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="privacy-card">
              <h3>2. Mô Tả Dịch Vụ</h3>
              <p>Hệ sinh thái QuackForge cung cấp các dịch vụ nội dung số, công cụ phân tích và giải trí trực tuyến:</p>
              <ul>
                <li>Quyền truy cập, trải nghiệm các dịch vụ số, công cụ tổng hợp cảm xúc AI và máy chủ trò chơi trực tuyến.</li>
                <li>Hệ thống điểm số, vật phẩm ảo, tài nguyên tiện ích mở rộng trong môi trường số hóa.</li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="privacy-card">
              <h3>3. Quy Định Tham Gia Và Hành Vi Của Người Dùng</h3>
              <p>Người dùng khi tham gia hệ thống QuackForge phải tuân thủ nghiêm ngặt các quy tắc sau:</p>
              <ul>
                <li><strong>Không sử dụng phần mềm gian lận / phá hoại:</strong> Nghiêm cấm tuyệt đối mọi hành vi can thiệp trái phép, khai thác lỗ hổng hoặc sử dụng công cụ phá hoại hệ thống.</li>
                <li><strong>Văn hóa ứng xử:</strong> Nghiêm cấm ngôn từ thô tục, xúc phạm, quấy rối hoặc lừa đảo người dùng khác.</li>
                <li><strong>Bảo vệ an ninh hệ thống:</strong> Nghiêm cấm các hành vi tấn công DDoS, cố tình gây gián đoạn hoặc phá hoại cơ sở hạ tầng dịch vụ.</li>
              </ul>
              <p>Ban quản trị có quyền tạm khóa hoặc khóa vĩnh viễn tài khoản vi phạm mà không có nghĩa vụ hoàn trả bất kỳ khoản phí nào đã thanh toán.</p>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="privacy-card">
              <h3>4. Tài Khoản Và Bảo Mật</h3>
              <p>
                Người dùng có trách nhiệm tự bảo vệ mật khẩu tài khoản của mình. Hộ Kinh Doanh QuackForge không chịu trách nhiệm đối với các trường hợp bị mất quyền truy cập tài khoản do người dùng tự ý chia sẻ thông tin cho bên thứ ba.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="privacy-card">
              <h3>5. Giao Dịch Thanh Toán Và Quyền Sử Dụng Dịch Vụ Số</h3>
              <p>
                Điểm số và các dịch vụ số được quy đổi từ tiền thanh toán chỉ có giá trị sử dụng nội bộ trên hệ thống QuackForge, không có giá trị quy đổi ngược lại thành tiền mặt hay bất kỳ tài sản thực tế nào ngoài đời thực.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.35}>
            <div className="privacy-card">
              <h3>6. Giới Hạn Trách Nhiệm Pháp Lý</h3>
              <p>
                Chúng tôi luôn nỗ lực duy trì hệ thống hoạt động ổn định 24/7. Tuy nhiên, dịch vụ có thể bị gián đoạn tạm thời để bảo trì định kỳ, nâng cấp hoặc do các sự cố bất khả kháng từ nhà cung cấp đường truyền mạng hay máy chủ vật lý.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="privacy-card">
              <h3>7. Điều Khoản Sửa Đổi Và Bổ Sung</h3>
              <p>
                Hộ Kinh Doanh QuackForge có quyền điều chỉnh, cập nhật các điều khoản này tại từng thời điểm để phù hợp với quy định pháp luật hiện hành và định hướng vận hành. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên website chính thức.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
