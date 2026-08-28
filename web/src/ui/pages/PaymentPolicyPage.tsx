import { ArrowLeft, ShieldCheck } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Reveal } from '../components/motion';

export default function PaymentPolicyPage() {
  return (
    <div className="privacy-page">
      <div className="container">
        <Reveal>
          <div className="privacy-header">
            <Link to="/" className="back-link">
              <ArrowLeft size={16} /> Trở về trang chủ
            </Link>
            <div className="privacy-eyebrow">
              <ShieldCheck size={16} /> Pháp Lý & Thanh Toán
            </div>
            <h1 className="section-title">Chính Sách Thanh Toán & Hoàn Tiền</h1>
            <p className="privacy-updated">Quy định về biểu giá, thanh toán trực tuyến, bàn giao dịch vụ số và xử lý khiếu nại</p>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="privacy-card legal-entity-card" style={{ marginBottom: '24px', background: 'rgba(255, 253, 248, 0.04)', border: '1px solid rgba(255, 253, 248, 0.12)', borderRadius: '14px', padding: '20px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Đơn vị vận hành:</strong> HỘ KINH DOANH QUACKFORGE</p>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Mã số thuế:</strong> 083204010221 do UBND Xã An Định cấp ngày 04/08/2026</p>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Đại diện pháp luật:</strong> Lương Duy Khang</p>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Địa chỉ trụ sở:</strong> số 135, Ấp Phú Lộc Thượng, Xã An Định, Tỉnh Vĩnh Long</p>
            <p style={{ margin: '0 0 6px', fontSize: '13.5px' }}><strong>Điện thoại liên hệ:</strong> 0943505127 • <strong>Email:</strong> support@quackforge.xyz</p>
            <p style={{ margin: 0, fontSize: '13.5px' }}><strong>Thời gian hỗ trợ thanh toán:</strong> Từ 08:00 đến 22:00 hàng ngày (kể cả Thứ Bảy và Chủ Nhật)</p>
          </div>
        </Reveal>

        <div className="privacy-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', lineHeight: '1.7' }}>
          <Reveal delay={0.1}>
            <div className="privacy-card">
              <h3>1. Phương Thức Thanh Toán Được Chấp Nhận</h3>
              <p>Hệ thống hỗ trợ các hình thức thanh toán điện tử tự động tiện lợi và an toàn:</p>
              <ul>
                <li><strong>Chuyển khoản Ngân hàng (VietQR / PayOS):</strong> Quét mã QR tự động qua ứng dụng ngân hàng di động hoặc ví điện tử có hỗ trợ VietQR. Giao dịch được bảo mật và đối soát tự động tức thì qua Cổng thanh toán trung gian PayOS.</li>
                <li><strong>Thẻ cào viễn thông:</strong> Nạp bằng thẻ cào điện thoại (Viettel, Vinaphone, Mobifone) và thẻ tiện ích thông qua hệ thống gạch thẻ tự động kết nối API đối tác được cấp phép.</li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="privacy-card">
              <h3>2. Bảng Giá Dịch Vụ & Tỷ Lệ Quy Đổi</h3>
              <p>Biểu giá và tỷ lệ quy đổi giá trị nội dung số được niêm yết công khai bằng Việt Nam Đồng (VNĐ):</p>
              <div style={{ overflowX: 'auto', margin: '16px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 253, 248, 0.2)', background: 'rgba(255, 253, 248, 0.06)' }}>
                      <th style={{ padding: '10px 14px' }}>Mệnh Giá Thanh Toán (VNĐ)</th>
                      <th style={{ padding: '10px 14px' }}>Chuyển Khoản Ngân Hàng (+20% Giá Trị)</th>
                      <th style={{ padding: '10px 14px' }}>Thẻ Cào Viễn Thông</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255, 253, 248, 0.08)' }}><td style={{ padding: '10px 14px' }}>10.000 VNĐ</td><td style={{ padding: '10px 14px' }}>12 Điểm/Xu</td><td style={{ padding: '10px 14px' }}>10 Điểm/Xu</td></tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 253, 248, 0.08)' }}><td style={{ padding: '10px 14px' }}>20.000 VNĐ</td><td style={{ padding: '10px 14px' }}>24 Điểm/Xu</td><td style={{ padding: '10px 14px' }}>20 Điểm/Xu</td></tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 253, 248, 0.08)' }}><td style={{ padding: '10px 14px' }}>50.000 VNĐ</td><td style={{ padding: '10px 14px' }}>60 Điểm/Xu</td><td style={{ padding: '10px 14px' }}>50 Điểm/Xu</td></tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 253, 248, 0.08)' }}><td style={{ padding: '10px 14px' }}>100.000 VNĐ</td><td style={{ padding: '10px 14px' }}>120 Điểm/Xu</td><td style={{ padding: '10px 14px' }}>100 Điểm/Xu</td></tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 253, 248, 0.08)' }}><td style={{ padding: '10px 14px' }}>200.000 VNĐ</td><td style={{ padding: '10px 14px' }}>240 Điểm/Xu</td><td style={{ padding: '10px 14px' }}>200 Điểm/Xu</td></tr>
                    <tr><td style={{ padding: '10px 14px' }}>500.000 VNĐ</td><td style={{ padding: '10px 14px' }}>600 Điểm/Xu</td><td style={{ padding: '10px 14px' }}>500 Điểm/Xu</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="privacy-card">
              <h3>3. Quy Trình Cung Cấp & Giao Nhận Dịch Vụ Số</h3>
              <ul>
                <li><strong>Thời gian bàn giao:</strong> Do đây là dịch vụ nội dung số trực tuyến, ngay sau khi ngân hàng/cổng thanh toán xác nhận giao dịch thành công, hệ thống sẽ tự động xử lý kích hoạt dịch vụ hoặc cộng quyền lợi tương ứng vào tài khoản trong vòng <strong>1 đến 3 phút</strong>.</li>
                <li><strong>Xác nhận giao dịch:</strong> Người dùng sẽ nhận được thông báo kích hoạt dịch vụ thành công ngay trên màn hình và trong nhật ký tài khoản.</li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="privacy-card">
              <h3>4. Chính Sách Hoàn Tiền & Đổi Trả</h3>
              <ul>
                <li><strong>Đặc thù dịch vụ số:</strong> Do đặc thù sản phẩm số: Dịch vụ số, nội dung số hóa và điểm số ảo sau khi được kích hoạt sẽ được tiêu dùng trực tiếp trên hệ thống. Do đó, sau khi giao dịch đã được hệ thống thực hiện thành công, chúng tôi <strong>không áp dụng chính sách đổi trả hoặc hoàn lại tiền mặt</strong>.</li>
                <li><strong>Trường hợp lỗi kỹ thuật:</strong> Nếu người dùng đã bị trừ tiền trong tài khoản ngân hàng nhưng hệ thống gặp sự cố đường truyền dẫn đến việc chưa được kích hoạt dịch vụ, người dùng vui lòng liên hệ ngay qua số điện thoại <strong>0943505127</strong> hoặc gửi thông tin hóa đơn đến <strong>support@quackforge.xyz</strong> trong khung giờ từ 08:00 đến 22:00 để được kích hoạt bổ sung trong vòng 15 đến 30 phút.</li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="privacy-card">
              <h3>5. Quy Trình Tiếp Nhận & Giải Quyết Khiếu Nại</h3>
              <p>Khi gặp bất kỳ sự cố nào liên quan đến thanh toán hoặc lỗi giao dịch số, người dùng thực hiện theo các bước sau trong khung giờ từ 08:00 đến 22:00:</p>
              <ol style={{ paddingLeft: '20px' }}>
                <li><strong>Bước 1:</strong> Chuẩn bị thông tin giao dịch: Tên tài khoản/mã định danh, Số tiền thanh toán, Thời gian chuyển khoản, Ảnh chụp màn hình hóa đơn giao dịch ngân hàng hoặc Mã thẻ/Số serial thẻ cào.</li>
                <li><strong>Bước 2:</strong> Gửi khiếu nại qua Hotline/Zalo: <strong>0943505127</strong> hoặc Email: <strong>support@quackforge.xyz</strong>.</li>
                <li><strong>Bước 3:</strong> Ban quản trị tiếp nhận, tra soát với ngân hàng/cổng thanh toán và giải quyết trong vòng <strong>15 - 30 phút</strong> (tối đa không quá 24 giờ làm việc).</li>
              </ol>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
