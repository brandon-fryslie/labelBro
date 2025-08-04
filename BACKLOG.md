# labelBro Development Backlog

## High Priority

### ✅ Auto-Discovery Printer Support (COMPLETED)
- **Goal**: Automatically discover only actually available Brother printers
- **Features**:
  - ✅ **Pure Auto-Discovery**: Only shows printers that are actually available
  - ✅ **No Static Configurations**: Removed all hardcoded printer settings
  - ✅ **Real-Time Discovery**: USB and network printer detection
  - ✅ **Refresh Button**: Manual discovery trigger in web UI
  - ✅ **Verified Connectivity**: All discovered printers are tested for availability
  - ✅ **Network Auto-Discovery**: mDNS/Bonjour and port scanning
  - ✅ **USB Auto-Discovery**: Automatic USB Brother printer detection
- **Technical Implementation**:
  - ✅ **One Way to Do Things**: Auto-discovery only, no fallbacks
  - ✅ **Verified Availability**: Only connected printers are shown
  - ✅ **Real-Time Validation**: Connection testing during discovery
  - ✅ **Clean UI**: Shows "0 printers" when none are available
  - ✅ **Network Scanning**: Threaded discovery with timeout controls

## Medium Priority

### UI/UX Improvements
- Better error handling and user feedback
- Improved label preview functionality
- Mobile-responsive design enhancements

### Code Quality
- Add comprehensive test coverage
- Implement proper logging system
- Code refactoring for better maintainability

## Low Priority

### Feature Enhancements
- Label template system
- Batch printing optimization
- Print queue management
- Label design customization options

### Documentation
- API documentation
- User manual
- Developer setup guide improvements
