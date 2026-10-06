MULTI SEARCH SWITCHER v1.2.1

Điểm khác so với v1.1:
- v1.1 chỉ hoạt động khi tìm trong popup hoặc gõ: ms + Space + truy vấn.
- v1.2 đăng ký Multi Search Switcher làm search provider mặc định của Chrome/Edge.
- Search bình thường trực tiếp trên thanh địa chỉ sẽ đi qua công cụ đang được chọn.
- Khi đổi ô trong popup/options, rule redirect được cập nhật ngay.

CÀI MỚI / NÂNG CẤP
1. Giải nén ZIP.
2. Mở chrome://extensions (Edge: edge://extensions).
3. Nên xóa bản v1.1 cũ để Chrome áp dụng lại search provider mặc định.
4. Bật Developer mode.
5. Chọn Load unpacked và trỏ vào thư mục multi-search-extension-v1.2.1.
6. Chrome có thể hỏi/hiển thị cảnh báo rằng tiện ích muốn thay đổi công cụ tìm kiếm mặc định. Hãy chấp nhận/giữ thay đổi nếu bạn muốn search trên thanh địa chỉ đi qua extension.

CÁCH DÙNG
- Bấm icon extension và chọn Google / GitHub / Google Scholar hoặc ô bạn tự thêm.
- Sau đó gõ trực tiếp truy vấn trên thanh địa chỉ như bình thường và Enter.
- URL có %s sẽ nhận truy vấn.
- Chế độ ms + Space vẫn được giữ làm phương án phụ.

LƯU Ý
- Chrome chỉ cho manifest khai báo một search provider mặc định tĩnh. Bản này dùng một URL router nội bộ dạng https://multi-search.invalid/... rồi dùng Declarative Net Request để chuyển sang URL của ô đang chọn.
- Với bản unpacked/local, cơ chế này phục vụ test trực tiếp. Nếu phát hành Chrome Web Store, phần search-provider/settings override còn chịu chính sách và yêu cầu xác minh domain của Chrome Web Store; khi đó nên dùng một domain router HTTPS thuộc quyền sở hữu của bạn.

"C:\Users\NguyenDucAnh\OneDrive\Pictures\Screenshots\Screenshot 2026-10-06 222313.png"
